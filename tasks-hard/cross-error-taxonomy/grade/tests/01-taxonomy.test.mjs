// Sub-problem 1: the failure type itself and the closed catalogue behind it.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CATALOGUE,
  CODES,
  catalogEntry,
  DomainError,
  domainError,
  wrap,
  isDomainError,
  chainOf,
} from '../src/index.js'

test('the catalogue is one closed table of codes, statuses and client messages', () => {
  assert.equal(catalogEntry('NOT_FOUND').status, 404)
  assert.equal(catalogEntry('NOT_FOUND').retryable, false)
  assert.equal(catalogEntry('NOT_FOUND').message, 'The requested record does not exist.')
  assert.equal(catalogEntry('RATE_LIMITED').status, 429)
  assert.equal(catalogEntry('RATE_LIMITED').retryable, true)
  assert.equal(catalogEntry('ROW_INVALID').status, 422)
  assert.equal(catalogEntry('WRITE_NOT_APPLIED').status, 500)
  assert.equal(catalogEntry('MADE_UP_CODE'), undefined)
  assert.equal(CODES.length, Object.keys(CATALOGUE).length)
  assert.deepEqual(CODES, [...CODES].sort())
})

test('the catalogue decides the status and the flag, and nothing raises the flag', () => {
  const table = [
    ['VALIDATION_FAILED', 400, false],
    ['FORBIDDEN', 403, false],
    ['ROW_INVALID', 422, false],
    ['INTERNAL', 500, false],
    ['WRITE_NOT_APPLIED', 500, false],
    ['RATE_LIMITED', 429, true],
    ['UPSTREAM_UNAVAILABLE', 502, true],
    ['DEPENDENCY_UNAVAILABLE', 503, true],
    ['UPSTREAM_TIMEOUT', 504, true],
  ]
  for (const [code, status, retryable] of table) {
    const error = domainError(code)
    assert.ok(error instanceof DomainError, code)
    assert.ok(isDomainError(error), code)
    assert.equal(error.code, code)
    assert.equal(error.status, status, code)
    assert.equal(error.retryable, retryable, code)
  }
  // the only thing a call site may say about the flag is "not this one"
  assert.equal(domainError('NOT_FOUND', { retryable: true }).retryable, false)
  assert.equal(domainError('DEPENDENCY_UNAVAILABLE', { retryable: false }).retryable, false)
})

test('a wrap keeps what it caught, however deep the chain runs', () => {
  const socket = new Error('socket hang up')
  const timeout = wrap(socket, 'UPSTREAM_TIMEOUT', { ctx: { correlationId: 'c-7' } })
  assert.equal(timeout.cause, socket)
  assert.equal(timeout.correlationId, 'c-7')
  assert.deepEqual(chainOf(timeout), ['UPSTREAM_TIMEOUT'])

  // a wrapper with no context of its own inherits the id of the failure it wraps
  const dependency = wrap(timeout, 'DEPENDENCY_UNAVAILABLE')
  const write = wrap(dependency, 'WRITE_NOT_APPLIED', { details: { id: 'r-1' } })
  assert.equal(write.correlationId, 'c-7')
  assert.deepEqual(chainOf(write), ['WRITE_NOT_APPLIED', 'DEPENDENCY_UNAVAILABLE', 'UPSTREAM_TIMEOUT'])
  assert.equal(write.code, 'WRITE_NOT_APPLIED')
  assert.equal(write.status, 500)
  assert.equal(write.retryable, false)
  assert.deepEqual(write.details, { id: 'r-1' })
  assert.equal(dependency.code, 'DEPENDENCY_UNAVAILABLE')
  assert.equal(dependency.status, 503)
  assert.equal(dependency.retryable, true)
  assert.equal(timeout.status, 504)
  assert.equal(timeout.retryable, true)

  // and the walk stops at whatever has no code of its own
  assert.deepEqual(chainOf(socket), [])
})

test('a code from somewhere else is not reported as one of ours', () => {
  const invented = domainError('SOMETHING_ELSE_ENTIRELY')
  assert.equal(invented.code, 'INTERNAL')
  assert.equal(invented.status, 500)
  assert.equal(invented.retryable, false)

  const syscall = Object.assign(new Error('no such file or directory'), { code: 'ENOENT' })
  assert.equal(isDomainError(syscall), false)
  assert.deepEqual(chainOf(syscall), [])

  const wrapped = wrap(syscall, 'INTERNAL')
  assert.equal(isDomainError(wrapped), true)
  assert.equal(wrapped.cause, syscall)
  assert.deepEqual(chainOf(wrapped), ['INTERNAL'])
})
