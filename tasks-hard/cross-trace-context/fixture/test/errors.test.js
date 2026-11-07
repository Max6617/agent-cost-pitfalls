import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createApp,
  createIdFactory,
  createEventBus,
  createFixedClock,
  mapError,
  AppError,
  NotFoundError,
  RetryableError,
  runInContext,
  beginTrace,
} from '../src/index.js'

const ids = (seed = 0) => createIdFactory({ seed, prefix: 'v-' })

test('a failed request returns the span the failure happened in', async () => {
  const clock = createFixedClock()
  const events = createEventBus({ clock })
  const app = createApp({ clock, events, idGen: ids() })

  const response = await app.request({ method: 'GET', path: '/read/missing' })
  assert.equal(response.status, 404)
  assert.equal(response.body.trace.traceId, response.span.traceId)
  assert.equal(response.body.trace.spanId, response.span.spanId)
})

test('the mapped body keeps the code of every error in the cause chain', () => {
  const root = new Error('connection reset')
  root.code = 'econnreset'
  const middle = new RetryableError('downstream is busy', { cause: root })
  const top = new AppError('could not complete the call', { code: 'outbound-failed', status: 502, cause: middle })

  const mapped = mapError(top)
  assert.deepEqual(mapped.body.cause.map((c) => c.code), ['outbound-failed', 'retryable', 'econnreset'])
})

test('an error is mapped in the span it was raised in', () => {
  const span = beginTrace({ idGen: ids(3) })
  const err = runInContext(span, () => new NotFoundError('no record r-9'))

  const mapped = mapError(err)
  assert.equal(mapped.body.trace.traceId, span.traceId)
  assert.equal(mapped.body.trace.spanId, span.spanId)
})

test('a rejected request reports the trace of the rejection', async () => {
  const clock = createFixedClock()
  const events = createEventBus({ clock })
  const app = createApp({ clock, events, idGen: ids() })

  const response = await app.request({ method: 'PUT', path: '/read/r-1', body: { status: 'closed' } })
  assert.equal(response.status, 401)
  assert.equal(response.body.error.code, 'unauthorized')
  assert.equal(response.body.trace.traceId, response.span.traceId)
})
