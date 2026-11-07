// Reproductions from the edge: what a client is told when the service talks to
// something else, reads a file, or answers at all.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  newContext,
  domainError,
  createOutbound,
  importCsv,
  mapError,
  buildErrorResponse,
} from '../src/index.js'

const ctx = newContext('req-9')

test('a transport that throws is an upstream that is unavailable', () => {
  const outbound = createOutbound(() => {
    throw new Error('ECONNREFUSED 10.0.0.5:8080')
  })
  assert.throws(
    () => outbound.send({ method: 'GET', path: '/v1/rates' }, { ctx }),
    (error) => {
      assert.equal(error.code, 'UPSTREAM_UNAVAILABLE')
      assert.equal(error.retryable, true)
      return true
    },
  )
})

test('a row the importer cannot read is a row failure, not a crash', () => {
  const file = ['id,title,quantity,tags', 'r-1,Widget,not-a-number,red'].join('\n')
  assert.throws(
    () => importCsv(file, { ctx }),
    (error) => {
      assert.equal(error.code, 'ROW_INVALID')
      return true
    },
  )
})

test('something that is not our failure is reported as an internal one', () => {
  const mapped = mapError(new Error('ECONNREFUSED 10.0.0.5:5432'), { ctx })
  assert.equal(mapped.code, 'INTERNAL')
  assert.equal(mapped.status, 500)
  assert.equal(mapped.retryable, false)
  assert.ok(!mapped.message.includes('ECONNREFUSED'))
})

test('the response body carries the code and the correlation id', () => {
  const response = buildErrorResponse(domainError('NOT_FOUND', { ctx }), { ctx })
  assert.equal(response.body.error.code, 'NOT_FOUND')
  assert.equal(response.body.error.correlationId, 'req-9')
  assert.equal(response.headers['x-correlation-id'], 'req-9')
})
