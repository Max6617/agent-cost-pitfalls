// Reproductions from the support queue: what a caller is told when a request,
// or a read, does not work out.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  newContext,
  createMemoryStore,
  createMemoryCache,
  createRepository,
  createCache,
  createService,
  isDomainError,
} from '../src/index.js'

const now = 1_700_000_000_000
const ctx = newContext('req-1')
const token = (scopes = ['records:read', 'records:write'], expiresAt = now + 60_000) => ({
  value: 'tok-1',
  subject: 'u-1',
  scopes,
  expiresAt,
})

function makeService() {
  return createService({
    repository: createRepository(createMemoryStore()),
    cache: createCache(createMemoryCache()),
  })
}

test('a body that is missing a field is refused as a validation failure', () => {
  const service = makeService()
  assert.throws(
    () => service.createRecord({ token: token(), body: { id: 'r-1', quantity: 2 } }, { ctx, now }),
    (error) => {
      assert.ok(isDomainError(error))
      assert.equal(error.code, 'VALIDATION_FAILED')
      assert.deepEqual(error.details.fields, ['title'])
      return true
    },
  )
})

test('a token that expired before the request is not an authenticated caller', () => {
  const service = makeService()
  assert.throws(
    () => service.getRecord('r-1', { token: token(['records:read'], now - 1) }, { ctx, now }),
    (error) => {
      assert.equal(error.code, 'UNAUTHENTICATED')
      return true
    },
  )
})

test('reading a record that is not there is a missing record, not a crash', () => {
  const repository = createRepository(createMemoryStore())
  assert.throws(
    () => repository.findById('r-404', { ctx }),
    (error) => {
      assert.ok(isDomainError(error))
      assert.equal(error.code, 'NOT_FOUND')
      return true
    },
  )
})

test('a cache hit answers from the cache without calling the loader', () => {
  const cache = createCache(createMemoryCache())
  let loads = 0
  const loader = () => {
    loads += 1
    return { id: 'r-1', title: 'Widget' }
  }

  const first = cache.lookup('r-1', loader, { ctx })
  assert.deepEqual(first, { value: { id: 'r-1', title: 'Widget' }, hit: false })

  const second = cache.lookup('r-1', loader, { ctx })
  assert.equal(second.hit, true)
  assert.equal(loads, 1)
})
