// Sub-problem 3: the repository over its store, and the cache in front of it.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  newContext,
  isDomainError,
  createMemoryStore,
  createMemoryCache,
  createRepository,
  createCache,
  createService,
} from '../src/index.js'

const now = 1_700_000_000_000
const ctx = newContext('req-3')
const token = { value: 'tok-1', subject: 'u-1', scopes: ['records:read', 'records:write'], expiresAt: now + 60_000 }
const seed = [{ id: 'r-1', title: 'Widget', quantity: 2, tags: [], version: 1 }]

test('a miss loads and stores, and a hit does not load again', () => {
  const repository = createRepository(createMemoryStore(seed))
  const cache = createCache(createMemoryCache())
  let loads = 0
  const loader = () => {
    loads += 1
    return repository.findById('r-1', { ctx })
  }

  const miss = cache.lookup('r-1', loader, { ctx })
  assert.equal(miss.hit, false)
  assert.equal(miss.value.title, 'Widget')

  const hit = cache.lookup('r-1', loader, { ctx })
  assert.equal(hit.hit, true)
  assert.equal(hit.value.title, 'Widget')
  assert.equal(loads, 1)
})

test('a record that is not there, and a write against a stale version', () => {
  const repository = createRepository(createMemoryStore(seed))

  assert.throws(
    () => repository.findById('r-404', { ctx }),
    (error) => {
      assert.ok(isDomainError(error))
      assert.equal(error.code, 'NOT_FOUND')
      assert.deepEqual(error.details, { id: 'r-404' })
      return true
    },
  )

  assert.throws(
    () => repository.insert({ id: 'r-1', title: 'Other', quantity: 1 }, { ctx }),
    (error) => {
      assert.equal(error.code, 'CONFLICT')
      assert.deepEqual(error.details, { id: 'r-1' })
      return true
    },
  )

  assert.throws(
    () => repository.update('r-1', { title: 'Other' }, { ctx, expectedVersion: 7 }),
    (error) => {
      assert.equal(error.code, 'CONFLICT')
      assert.deepEqual(error.details, { id: 'r-1', expected: 7, actual: 1 })
      return true
    },
  )

  assert.equal(repository.findById('r-1', { ctx }).title, 'Widget')
  const updated = repository.update('r-1', { title: 'Widget v2' }, { ctx, expectedVersion: 1 })
  assert.equal(updated.title, 'Widget v2')
  assert.equal(updated.version, 2)
})

test('a store that fails is a dependency failure and keeps what it threw', () => {
  const boom = new Error('ECONNREFUSED 10.0.0.5:5432')
  const healthy = createMemoryStore(seed)
  const repository = createRepository({
    ...healthy,
    read() {
      throw boom
    },
  })

  assert.throws(
    () => repository.findById('r-1', { ctx }),
    (error) => {
      assert.ok(isDomainError(error))
      assert.equal(error.code, 'DEPENDENCY_UNAVAILABLE')
      assert.equal(error.retryable, true)
      return true
    },
  )
})

test('a broken cache is not a missing record, and a miss is not a failure', () => {
  const repository = createRepository(createMemoryStore(seed))
  const serviceWith = (backing) => createService({ repository, cache: createCache(backing) })

  // a cache that cannot be read is reported, and the loader never runs
  const reset = new Error('redis: connection reset by peer')
  let loads = 0
  const unreadable = createCache({
    ...createMemoryCache(),
    get() {
      throw reset
    },
  })
  assert.throws(
    () => unreadable.lookup('r-1', () => {
      loads += 1
      return repository.findById('r-1', { ctx })
    }, { ctx }),
    (error) => {
      assert.ok(isDomainError(error))
      assert.equal(error.code, 'DEPENDENCY_UNAVAILABLE')
      return true
    },
  )
  assert.equal(loads, 0)

  // a cache that cannot be written to loses nothing: the value is already here
  const unwritable = createCache({
    get() {
      return undefined
    },
    set() {
      throw new Error('redis: read only replica')
    },
  })
  const value = unwritable.lookup('r-1', () => repository.findById('r-1', { ctx }), { ctx })
  assert.equal(value.hit, false)
  assert.equal(value.value.title, 'Widget')

  // and a missing record stays missing however it was reached
  assert.throws(
    () => serviceWith(createMemoryCache()).getRecord('r-404', { token }, { ctx, now }),
    (error) => {
      assert.equal(error.code, 'NOT_FOUND')
      return true
    },
  )
})

test('a write that may have landed is not passed off as retryable', () => {
  const boom = new Error('ECONNREFUSED 10.0.0.5:5432')
  const down = {
    read() {
      throw boom
    },
    write() {
      throw boom
    },
    list() {
      return []
    },
  }
  const service = createService({
    repository: createRepository(down),
    cache: createCache(createMemoryCache()),
  })
  const body = { id: 'r-2', title: 'Widget', quantity: 1 }

  assert.throws(
    () => service.createRecord({ token, body }, { ctx, now }),
    (error) => {
      assert.equal(error.code, 'WRITE_NOT_APPLIED')
      assert.equal(error.retryable, false)
      assert.deepEqual(error.details, { id: 'r-2' })
      assert.equal(error.cause.code, 'DEPENDENCY_UNAVAILABLE')
      assert.equal(error.cause.retryable, true)
      return true
    },
  )

  // a write the client can repeat is reported as what actually happened
  assert.throws(
    () => service.createRecord({ token, body: { ...body, id: 'r-3', idempotencyKey: 'k-1' } }, { ctx, now }),
    (error) => {
      assert.equal(error.code, 'DEPENDENCY_UNAVAILABLE')
      assert.equal(error.retryable, true)
      return true
    },
  )
})
