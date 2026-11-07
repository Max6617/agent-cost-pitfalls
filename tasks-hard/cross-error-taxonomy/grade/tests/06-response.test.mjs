// Sub-problem 6: the error mapper and the HTTP response builder.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  newContext,
  domainError,
  mapError,
  buildSuccess,
  buildErrorResponse,
  createMemoryStore,
  createMemoryCache,
  createRepository,
  createCache,
  createService,
} from '../src/index.js'

const now = 1_700_000_000_000
const ctx = newContext('req-6')
const token = { value: 'tok-1', subject: 'u-1', scopes: ['records:read', 'records:write'], expiresAt: now + 60_000 }

test('a success is a 200 with the data in it and no failure', () => {
  const response = buildSuccess({ ok: true, record: { id: 'r-1' } }, { ctx })
  assert.equal(response.status, 200)
  assert.equal(response.headers['content-type'], 'application/json')
  assert.deepEqual(response.body, { data: { ok: true, record: { id: 'r-1' } } })
  assert.equal('error' in response.body, false)
})

test('a client is told the code, the catalogue message and the correlation id', () => {
  const missing = buildErrorResponse(domainError('NOT_FOUND', { ctx, message: 'there is no record r-9' }), { ctx })
  assert.equal(missing.status, 404)
  assert.equal(missing.headers['content-type'], 'application/json')
  assert.equal(missing.headers['x-correlation-id'], 'req-6')
  assert.deepEqual(missing.body.error, {
    code: 'NOT_FOUND',
    message: 'The requested record does not exist.',
    retryable: false,
    correlationId: 'req-6',
  })

  const foreign = buildErrorResponse(new Error('ECONNREFUSED 10.0.0.5:5432'), { ctx })
  assert.equal(foreign.status, 500)
  assert.equal(foreign.body.error.code, 'INTERNAL')
  assert.equal(foreign.body.error.retryable, false)
  assert.equal(foreign.body.error.message, 'Something went wrong on our side.')
  assert.ok(!JSON.stringify(foreign).includes('ECONNREFUSED'))
  assert.ok(!JSON.stringify(foreign).includes('10.0.0.5'))

  const mapped = mapError(domainError('RATE_LIMITED', { ctx }), { ctx })
  assert.equal(mapped.status, 429)
  assert.equal(mapped.retryable, true)
  assert.equal(mapped.correlationId, 'req-6')
})

test('a failure raised deep inside an import still names its row at the edge', () => {
  const service = createService({
    repository: createRepository(createMemoryStore()),
    cache: createCache(createMemoryCache()),
  })
  const file = ['id,title,quantity,tags', 'r-1,Widget,2,red', 'r-2,Gadget,0,red'].join('\n')

  let thrown = null
  try {
    service.importRecords(file, { token }, { ctx, now })
  } catch (error) {
    thrown = error
  }

  assert.ok(thrown !== null, 'the import is expected to fail on its second row')
  const response = buildErrorResponse(thrown, { ctx })
  assert.equal(response.status, 422)
  assert.equal(response.headers['x-correlation-id'], 'req-6')
  assert.equal(response.body.error.code, 'ROW_INVALID')
  assert.equal(response.body.error.details.row, 2)
  assert.deepEqual(response.body.error.details.fields, ['quantity'])
  assert.equal(response.body.error.message, 'The file contains a row that could not be imported.')
  assert.equal(response.body.error.retryable, false)
})

test('a code this service does not own never reaches a client', () => {
  const invented = buildErrorResponse(domainError('SOMETHING_ELSE_ENTIRELY', { ctx }), { ctx })
  assert.equal(invented.status, 500)
  assert.equal(invented.body.error.code, 'INTERNAL')

  const syscall = Object.assign(new Error('no such file or directory'), { code: 'ENOENT' })
  const response = buildErrorResponse(syscall, { ctx })
  assert.equal(response.status, 500)
  assert.equal(response.body.error.code, 'INTERNAL')
  assert.equal(response.body.error.retryable, false)
  assert.equal(response.body.error.correlationId, 'req-6')
  assert.ok(!JSON.stringify(response).includes('ENOENT'))
  assert.ok(!JSON.stringify(response).includes('no such file'))
})
