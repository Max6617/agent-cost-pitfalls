import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRetryAfter, waitFor, isTooLong, isRetryableStatus, DEFAULT_WAIT_MS, MAX_WAIT_MS } from '../src/retry.js'

test('a delta-seconds value is read as seconds', () => {
  assert.deepEqual(parseRetryAfter('120'), { kind: 'seconds', ms: 120000 })
  assert.deepEqual(parseRetryAfter(5), { kind: 'seconds', ms: 5000 })
})

test('zero seconds is a real instruction, not a missing value', () => {
  assert.deepEqual(parseRetryAfter('0'), { kind: 'seconds', ms: 0 })
})

test('an HTTP date is read as an instant', () => {
  const parsed = parseRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT')
  assert.equal(parsed.kind, 'date')
  assert.equal(parsed.ms, Date.parse('Wed, 21 Oct 2026 07:28:00 GMT'))
})

test('a missing header falls back to the default wait', () => {
  assert.deepEqual(parseRetryAfter(undefined), { kind: 'none', ms: DEFAULT_WAIT_MS })
  assert.deepEqual(parseRetryAfter(''), { kind: 'none', ms: DEFAULT_WAIT_MS })
})

test('a value that is neither spelling falls back to the default', () => {
  assert.deepEqual(parseRetryAfter('soon'), { kind: 'none', ms: DEFAULT_WAIT_MS })
  assert.deepEqual(parseRetryAfter('12.5'), { kind: 'none', ms: DEFAULT_WAIT_MS })
  assert.deepEqual(parseRetryAfter('-3'), { kind: 'none', ms: DEFAULT_WAIT_MS })
})

test('a date wait is measured from when the response arrived', () => {
  const receivedAt = Date.parse('Wed, 21 Oct 2026 07:27:00 GMT')
  const response = { headers: { 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' }, receivedAt }
  assert.equal(waitFor(response), 60000)
})

test('a date already in the past means no wait at all', () => {
  const receivedAt = Date.parse('Wed, 21 Oct 2026 07:29:00 GMT')
  const response = { headers: { 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' }, receivedAt }
  assert.equal(waitFor(response), 0)
})

test('a response slower than the requested wait does not wait longer than asked', () => {
  const receivedAt = Date.parse('Wed, 21 Oct 2026 07:28:00 GMT')
  const response = { headers: { 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' }, receivedAt }
  assert.equal(waitFor(response), 0)
})

test('a seconds wait does not depend on the clock at all', () => {
  const response = { headers: { 'retry-after': '30' } }
  assert.equal(waitFor(response, 1), 30000)
  assert.equal(waitFor(response, 9_999_999), 30000)
})

test('the header name is matched either way round', () => {
  assert.equal(waitFor({ headers: { 'Retry-After': '2' } }), 2000)
})

test('a wait past the ceiling is reported as too long', () => {
  assert.equal(isTooLong(MAX_WAIT_MS + 1), true)
  assert.equal(isTooLong(MAX_WAIT_MS), false)
})

test('only the two back-pressure statuses are retried', () => {
  assert.equal(isRetryableStatus(429), true)
  assert.equal(isRetryableStatus(503), true)
  assert.equal(isRetryableStatus(500), false)
  assert.equal(isRetryableStatus(404), false)
})
