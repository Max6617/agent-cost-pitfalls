// Sub-problem 2: request validation and auth, and the order they happen in.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  newContext,
  validateRequest,
  checkAuth,
  isDomainError,
  createMemoryStore,
  createMemoryCache,
  createRepository,
  createCache,
  createService,
} from '../src/index.js'

const now = 1_700_000_000_000
const ctx = newContext('req-2')
const token = (over = {}) => ({
  value: 'tok-1',
  subject: 'u-1',
  scopes: ['records:read', 'records:write'],
  expiresAt: now + 60_000,
  ...over,
})

function makeService() {
  return createService({
    repository: createRepository(createMemoryStore()),
    cache: createCache(createMemoryCache()),
  })
}

test('a valid request creates a record the service can read back', () => {
  const service = makeService()
  const created = service.createRecord(
    { token: token(), body: { id: 'r-1', title: 'Widget', quantity: 3 } },
    { ctx, now },
  )
  assert.equal(created.ok, true)
  assert.equal(created.created, true)
  assert.equal(created.record.id, 'r-1')
  assert.equal(created.record.version, 1)

  const read = service.getRecord('r-1', { token: token() }, { ctx, now })
  assert.equal(read.record.title, 'Widget')
})

test('a body names every field that is wrong, not just the first one', () => {
  assert.throws(
    () => validateRequest({ id: 'R-1', title: '   ', quantity: 0 }, { ctx }),
    (error) => {
      assert.ok(isDomainError(error))
      assert.equal(error.code, 'VALIDATION_FAILED')
      assert.deepEqual(error.details.fields, ['id', 'quantity', 'title'])
      return true
    },
  )

  assert.throws(
    () => validateRequest({ id: 'r-1', title: 'Widget', quantity: 1001, tags: ['red', 7] }, { ctx }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_FAILED')
      assert.deepEqual(error.details.fields, ['quantity', 'tags'])
      return true
    },
  )

  assert.throws(
    () => validateRequest({ id: 'r-1', title: 'Widget', quantity: 1, idempotencyKey: '' }, { ctx }),
    (error) => {
      assert.deepEqual(error.details.fields, ['idempotencyKey'])
      return true
    },
  )
})

test('a body is normalised before anything is done with it', () => {
  const body = validateRequest(
    { id: 'r-2', title: '  Widget  ', quantity: 1, tags: ['  Blue ', 'red', 'RED', 'blue'] },
    { ctx },
  )
  assert.equal(body.title, 'Widget')
  assert.deepEqual(body.tags, ['blue', 'red'])

  // a title is measured in characters, not in UTF-16 code units
  const exact = validateRequest({ id: 'r-3', title: '😀'.repeat(120), quantity: 1000 }, { ctx })
  assert.equal([...exact.title].length, 120)

  assert.throws(
    () => validateRequest({ id: 'r-4', title: '😀'.repeat(121), quantity: 1 }, { ctx }),
    (error) => {
      assert.deepEqual(error.details.fields, ['title'])
      return true
    },
  )
  assert.throws(
    () => validateRequest({ id: 'r-5', title: 'Widget', quantity: 0 }, { ctx }),
    (error) => {
      assert.deepEqual(error.details.fields, ['quantity'])
      return true
    },
  )
})

test('who is asking is settled before what they sent', () => {
  const service = makeService()
  const nonsense = { id: 'r-9', quantity: 0 }

  assert.throws(
    () => service.createRecord({ token: undefined, body: nonsense }, { ctx, now }),
    (error) => {
      assert.equal(error.code, 'UNAUTHENTICATED')
      return true
    },
  )

  assert.throws(
    () => service.createRecord({ token: token({ scopes: ['records:read'] }), body: nonsense }, { ctx, now }),
    (error) => {
      assert.equal(error.code, 'FORBIDDEN')
      return true
    },
  )

  // a token expires at its expiry instant, and is alive a millisecond before it
  assert.throws(
    () => checkAuth(token({ expiresAt: now }), { ctx, now, requiredScope: 'records:write' }),
    (error) => {
      assert.equal(error.code, 'UNAUTHENTICATED')
      return true
    },
  )
  const alive = checkAuth(token({ expiresAt: now + 1 }), { ctx, now, requiredScope: 'records:write' })
  assert.equal(alive.subject, 'u-1')
})
