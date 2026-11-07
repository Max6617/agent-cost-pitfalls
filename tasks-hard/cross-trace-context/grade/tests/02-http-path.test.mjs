// Sub-problem 2: the HTTP path. One trace id from the ingress frame to the
// outbound call, with every step nested where the contract says it is.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  beginTrace,
  createApp,
  createEventBus,
  createFixedClock,
  createIdFactory,
  ofKind,
  runInContext,
} from '../src/index.js'

const ids = (seed = 40) => createIdFactory({ seed, prefix: 'h-' })
const USER = { authorization: 'Bearer tok-user-42' }

const newApp = (overrides = {}) => {
  const clock = createFixedClock()
  const events = createEventBus({ clock })
  const app = createApp({ clock, events, idGen: ids(), ...overrides })
  return { app, events, clock }
}

test('every event of a request is reported in the request span', async () => {
  const { app, events } = newApp()
  const response = await app.request({ method: 'GET', path: '/read/r-1' })

  const emitted = events.events()
  assert.ok(emitted.length >= 4, 'expected the whole path to report, got ' + emitted.length)
  for (const event of emitted) {
    assert.equal(event.traceId, response.span.traceId, event.name + ' lost the trace id')
    assert.equal(event.spanId, response.span.spanId, event.name + ' was reported in another span')
  }

  // A trace id that arrives in a header is the caller's, not ours: reusing it
  // would put two unrelated requests in one trace.
  const header = await app.request({
    method: 'GET',
    path: '/status',
    headers: { 'x-request-id': 'caller-trace-1', traceparent: '00-caller-trace-2-00' },
  })
  assert.notEqual(header.span.traceId, 'caller-trace-1')
  for (const event of events.events()) {
    assert.notEqual(event.traceId, 'caller-trace-1')
    assert.notEqual(event.spanId, 'caller-trace-2')
  }
})

test('a request that is re-entered from inside a trace joins that trace', async () => {
  const { app, events } = newApp()
  const outer = beginTrace({ idGen: ids(70) })
  let inner
  let second
  await runInContext(outer, async () => {
    inner = await app.request({ method: 'GET', path: '/status' })
    second = await app.request({ method: 'GET', path: '/status' })
  })
  assert.equal(inner.span.traceId, outer.traceId, 'the nested request started a trace of its own')
  assert.equal(inner.span.parentSpanId, outer.spanId, 'the nested request is not a child of the caller')
  assert.notEqual(second.span.spanId, inner.span.spanId, 'two sub-requests shared one span')
  assert.equal(second.span.traceId, outer.traceId)

  // The two sub-requests share the trace id and never the span id.
  for (const event of events.events()) {
    assert.equal(event.traceId, outer.traceId)
    assert.notEqual(event.spanId, outer.spanId, event.name + ' was reported in the caller span')
  }
  assert.equal(new Set(events.events().map((e) => e.spanId)).size, 2, 'the two sub-requests shared a span')
})

test('an outbound call reports itself in a span of its own', async () => {
  const { app, events } = newApp()
  const response = await app.request({
    method: 'POST',
    path: '/send',
    headers: USER,
    body: { url: 'https://downstream.internal/orders' },
  })

  const request = ofKind(events.events(), 'outbound')[0]
  assert.equal(request.name, 'outbound.request')
  assert.equal(request.traceId, response.span.traceId)
  assert.notEqual(request.spanId, response.span.spanId, 'the call reused the span that made it')
  assert.equal(request.parentSpanId, response.span.spanId, 'the call is not nested under the span that made it')
})

test('the ingress frame is the root of the trace and every span below it is covered', async () => {
  const { app, events } = newApp()
  const response = await app.handle({
    method: 'POST',
    path: '/send',
    headers: USER,
    body: { url: 'https://downstream.internal/orders' },
  })

  const emitted = events.events()
  assert.equal(response.span.parentSpanId, undefined, 'a request entered with nothing running is a root')
  const spanIds = new Set(emitted.map((e) => e.spanId))
  assert.ok(spanIds.has(response.span.spanId))
  for (const event of emitted) {
    assert.equal(event.traceId, response.span.traceId)
    if (event.parentSpanId !== undefined) {
      assert.ok(spanIds.has(event.parentSpanId), event.name + ' hangs off a span nobody ever reported')
    }
  }
})
test('two requests in flight at once do not bleed into each other', async () => {
  const clock = createFixedClock()
  const events = createEventBus({ clock })
  let releaseFirst
  const firstBlocked = new Promise((resolve) => {
    releaseFirst = resolve
  })
  let firstParked
  const firstParkedAt = new Promise((resolve) => {
    firstParked = resolve
  })
  const app = createApp({
    clock,
    events,
    idGen: ids(80),
    hooks: {
      'r-3': async () => {
        firstParked()
        await firstBlocked
      },
    },
  })

  // The first request is parked inside the repository while the second one runs
  // to completion, so the two pipelines are genuinely interleaved.
  const slow = app.request({ method: 'GET', path: '/read/r-3' })
  await firstParkedAt
  const quick = await app.request({ method: 'GET', path: '/read/r-2' })
  releaseFirst()
  const first = await slow

  assert.notEqual(first.span.traceId, quick.span.traceId)
  const quickEvents = events.events().filter((e) => e.traceId === quick.span.traceId)
  assert.ok(quickEvents.length >= 3, 'the fast request reported nothing')
  for (const event of quickEvents) {
    assert.equal(event.spanId, quick.span.spanId, event.name + ' ran in the other request')
  }
  const known = new Set([first.span.traceId, quick.span.traceId])
  for (const event of events.events()) {
    assert.ok(known.has(event.traceId), event.name + ' has a trace from nowhere')
  }
})
