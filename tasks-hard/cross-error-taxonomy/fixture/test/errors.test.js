// Reproductions from the platform tickets: what a failure is and what it costs.
import test from 'node:test'
import assert from 'node:assert/strict'
import { domainError, wrap, chainOf } from '../src/index.js'

test('a code carries the status and the retryability the catalogue gives it', () => {
  const invalid = domainError('VALIDATION_FAILED')
  assert.equal(invalid.code, 'VALIDATION_FAILED')
  assert.equal(invalid.status, 400)
  assert.equal(invalid.retryable, false)

  const timeout = domainError('UPSTREAM_TIMEOUT')
  assert.equal(timeout.status, 504)
  assert.equal(timeout.retryable, true)
})

test('wrapping a failure keeps the failure it caught', () => {
  const socket = new Error('socket hang up')
  const error = wrap(socket, 'UPSTREAM_UNAVAILABLE')
  assert.equal(error.cause, socket)
  assert.deepEqual(chainOf(error), ['UPSTREAM_UNAVAILABLE'])
})
