// Sub-problem 4: errors. The mapper reports the span the failure happened in
// and keeps the whole cause chain readable.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AppError,
  ConflictError,
  OutboundError,
  RetryableError,
  beginTrace,
  createApp,
  createEventBus,
  createFixedClock,
  createIdFactory,
  mapError,
  runInContext,
} from '../src/index.js'

const ids = (seed = 200) => createIdFactory({ seed, prefix: 'e-' })
const USER = { authorization: 'Bearer tok-user-42' }

const newApp = (overrides = {}) => {
  const clock = createFixedClock()
  const events = createEventBus({ clock })
  const app = createApp({ clock, events, idGen: ids(), ...overrides })
  return { app, events, clock }
}

test('an error is mapped in the span it was raised in', () => {
  const span = beginTrace({ idGen: ids(1) })
  const raised = runInContext(span, () => new ConflictError('already written'))
  const mapped = mapError(raised)

  assert.equal(mapped.status, 409)
  assert.equal(mapped.body.trace.traceId, span.traceId)
  assert.equal(mapped.body.trace.spanId, span.spanId)
  assert.equal(mapped.body.trace.parentSpanId, span.parentSpanId)
})

test('an error carries the span it was raised in even when it is mapped outside it', () => {
  const raisedIn = beginTrace({ idGen: ids(2) })
  const mappedIn = beginTrace({ idGen: ids(3) })
  const raised = runInContext(raisedIn, () => new OutboundError('downstream refused'))
  const mapped = runInContext(mappedIn, () => mapError(raised))

  assert.equal(mapped.status, 502)
  assert.equal(mapped.body.trace.traceId, raisedIn.traceId)
  assert.equal(mapped.body.trace.spanId, raisedIn.spanId)
  assert.notEqual(mapped.body.trace.traceId, mappedIn.traceId)
})

test('the trace id the client is told is the one the log line carries', async () => {
  const { app, events } = newApp()
  const response = await app.request({ method: 'GET', path: '/read/missing-record' })

  assert.equal(response.status, 404)
  assert.equal(response.body.trace.traceId, response.span.traceId)
  assert.equal(response.body.trace.spanId, response.span.spanId)
  const written = events.events()
  assert.ok(written.length >= 2, 'the failure reported nothing')
  assert.ok(written.every((e) => e.traceId === response.body.trace.traceId))

  // The mapper is reached from a different frame than the failure came from:
  // the body must still name the span the failure was raised in.
  const detached = mapError(new OutboundError('downstream refused'))
  assert.deepEqual(Object.keys(detached.body.trace).sort(), ['parentSpanId', 'spanId', 'traceId'])
  assert.equal(detached.body.trace.traceId, undefined, 'a failure with no span must not invent one')
})

test('the cause chain keeps every code, innermost last', () => {
  const socket = Object.assign(new Error('socket closed'), { code: 'econnreset' })
  const retryable = new RetryableError('downstream is busy', { cause: socket })
  const top = new AppError('could not place the order', {
    code: 'order-failed',
    status: 502,
    cause: retryable,
    details: { orderId: 'o-9' },
  })

  const span = beginTrace({ idGen: ids(4) })
  const mapped = runInContext(span, () => mapError(top))
  assert.equal(mapped.status, 502)
  assert.equal(mapped.body.error.code, 'order-failed')
  assert.deepEqual(mapped.body.error.details, { orderId: 'o-9' })
  assert.equal(mapped.body.trace.spanId, span.spanId)
  assert.deepEqual(mapped.body.cause.map((c) => c.code), ['order-failed', 'retryable', 'econnreset'])
  assert.deepEqual(mapped.body.cause.map((c) => c.message), [
    'could not place the order',
    'downstream is busy',
    'socket closed',
  ])
})

test('a rejected request is mapped in the span that rejected it', async () => {
  const { app } = newApp()
  const response = await app.request({ method: 'PUT', path: '/read/r-1', body: { status: 'open' } })

  assert.equal(response.status, 401)
  assert.equal(response.body.error.code, 'unauthorized')
  assert.equal(response.body.trace.traceId, response.span.traceId)
  assert.equal(response.body.trace.spanId, response.span.spanId)

  const denied = await app.request({ method: 'PUT', path: '/read/r-1', headers: { authorization: 'Bearer nope' } })
  assert.equal(denied.status, 401)
  assert.equal(denied.body.error.details.reason, 'unknown-token')
  assert.deepEqual(denied.body.cause.map((c) => c.code), ['unauthorized'])
  assert.equal(denied.body.trace.spanId, denied.span.spanId)

  const refused = await app.request({
    method: 'POST',
    path: '/diagnose',
    headers: USER,
    body: { url: 'https://downstream.internal/health' },
  })
  assert.equal(refused.status, 403)
  assert.equal(refused.body.error.details.reason, 'not-system')
  assert.equal(refused.body.trace.traceId, refused.span.traceId)
  assert.deepEqual(refused.body.cause.map((c) => c.code), ['forbidden'])
})

