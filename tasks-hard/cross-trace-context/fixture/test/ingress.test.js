import test from 'node:test'
import assert from 'node:assert/strict'
import { createApp, createIdFactory, createEventBus, createFixedClock, ofKind } from '../src/index.js'

const USER = { authorization: 'Bearer tok-user-42' }

const app0 = (overrides = {}) => {
  const clock = createFixedClock()
  const events = createEventBus({ clock })
  const app = createApp({ clock, events, idGen: createIdFactory({ seed: 0, prefix: 'v-' }), ...overrides })
  return { app, events, clock }
}

test('every event of a request carries the request trace id', async () => {
  const { app, events } = app0()
  const response = await app.request({ method: 'GET', path: '/read/r-1' })
  const emitted = events.events()
  assert.ok(emitted.length >= 4, 'expected several events, got ' + emitted.length)
  for (const event of emitted) {
    assert.equal(event.traceId, response.span.traceId, event.name + ' lost the trace id')
  }
})

test('a cache hit is reported in the span that hit it, not the span that filled it', async () => {
  const { app, events } = app0()
  const first = await app.request({ method: 'GET', path: '/read/r-1' })
  events.clear()
  const second = await app.request({ method: 'GET', path: '/read/r-1' })

  const [hit] = ofKind(events.events(), 'cache')
  assert.equal(hit.name, 'cache.hit')
  assert.equal(hit.traceId, second.span.traceId)
  assert.equal(hit.spanId, second.span.spanId)
  assert.notEqual(hit.traceId, first.span.traceId)
})

test('the repository read and the response report the same span', async () => {
  const { app, events } = app0()
  const response = await app.request({ method: 'GET', path: '/read/r-2' })
  const ids = new Set(events.events().map((e) => e.spanId))
  assert.deepEqual([...ids], [response.span.spanId])
})

test('two interleaved requests keep their own traces', async () => {
  const clock = createFixedClock()
  const events = createEventBus({ clock })
  let release
  const blocked = new Promise((resolve) => {
    release = resolve
  })
  const app = createApp({
    clock,
    events,
    idGen: createIdFactory({ seed: 0, prefix: 'v-' }),
    hooks: { 'r-3': () => blocked },
  })

  // The first request is parked inside the repository while the second one runs
  // all the way through, so the two pipelines interleave on purpose.
  const slow = app.request({ method: 'GET', path: '/read/r-3' })
  const quick = await app.request({ method: 'GET', path: '/read/r-2' })
  release()
  const first = await slow

  assert.notEqual(first.span.traceId, quick.span.traceId)
  const traces = new Set([first.span.traceId, quick.span.traceId])
  for (const event of events.events()) {
    assert.ok(traces.has(event.traceId), event.name + ' has a trace from nowhere: ' + event.traceId)
  }
  const quickSpans = events.events().filter((e) => e.traceId === quick.span.traceId).map((e) => e.spanId)
  assert.ok(quickSpans.length > 0, 'the fast request emitted nothing')
  assert.deepEqual([...new Set(quickSpans)], [quick.span.spanId])
})
