// Sub-problem 6: the audit writer, plus the two interactions that only appear
// when ordering, retries and nesting are all in play at once.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AppError,
  RetryableError,
  beginTrace,
  createApp,
  createAuditWriter,
  createEventBus,
  createFixedClock,
  createIdFactory,
  ofKind,
  runInContext,
} from '../src/index.js'

const ids = (seed = 400) => createIdFactory({ seed, prefix: 'a-' })
const USER = { authorization: 'Bearer tok-user-42' }

const newApp = (overrides = {}) => {
  const clock = createFixedClock()
  const events = createEventBus({ clock })
  const app = createApp({ clock, events, idGen: ids(), ...overrides })
  return { app, events, clock }
}

test('an audit entry written after its span closed still carries that span', () => {
  const clock = createFixedClock()
  const events = createEventBus({ clock })
  const writer = createAuditWriter({ events, clock })
  const request = beginTrace({ idGen: ids(1) })

  runInContext(request, () => {
    writer.record('record.read.requested', { id: 'r-1' })
    const nested = { traceId: request.traceId, spanId: 'nested-span', parentSpanId: request.spanId }
    runInContext(nested, () => {
      writer.record('handler.level', { n: 2 })
    })
  })
  assert.equal(writer.pending, 2, 'the entries should still be buffered')
  writer.flush()

  const [first, second] = ofKind(events.events(), 'audit')
  assert.equal(first.name, 'audit.written')
  assert.equal(first.traceId, request.traceId, 'the entry lost the trace that recorded it')
  assert.equal(first.spanId, request.spanId)
  assert.equal(first.parentSpanId, request.parentSpanId)
  assert.equal(first.meta.action, 'record.read.requested')
  assert.equal(second.spanId, 'nested-span', 'the nested entry was written under the parent span')
  assert.equal(second.traceId, request.traceId)
  assert.equal(second.parentSpanId, request.spanId)
})

test('the service flushes its audit buffer under the span that recorded it', async () => {
  const { app, events } = newApp()
  const response = await app.request({ method: 'GET', path: '/read/r-1' })

  const written = ofKind(events.events(), 'audit')
  assert.ok(written.length >= 1, 'the service never flushed its audit buffer')
  for (const entry of written) {
    assert.equal(entry.traceId, response.span.traceId, 'the entry was written under another trace')
    assert.equal(entry.spanId, response.span.spanId)
  }
  assert.deepEqual(written.map((e) => e.meta.seq), written.map((_, i) => i + 1), 'entries are not written in order')
  assert.deepEqual(written.map((e) => e.meta.action), ['record.read.requested'])
  assert.equal(app.audit.pending, 0)
})

test('each retry attempt is its own child span of the same parent', async () => {
  let calls = 0
  const { app, events } = newApp({
    transport: async () => {
      calls += 1
      if (calls < 3) throw new RetryableError('downstream is warming up')
      return { status: 200, body: { ok: true } }
    },
  })
  const response = await app.request({
    method: 'POST',
    path: '/send',
    headers: USER,
    body: { url: 'https://downstream.internal/orders', attempts: 3 },
  })

  assert.equal(calls, 3)
  assert.equal(response.status, 200)
  const attempts = events.events().filter((e) => e.name === 'outbound.request')
  assert.equal(attempts.length, 3, 'every attempt should report its own request event')
  assert.deepEqual(attempts.map((e) => e.meta.attempt), [1, 2, 3])
  assert.equal(new Set(attempts.map((e) => e.spanId)).size, 3, 'the attempts shared a span')
  assert.equal(new Set(attempts.map((e) => e.traceId)).size, 1, 'the attempts split into several traces')
  assert.equal(new Set(attempts.map((e) => e.meta.attempt)).size, 3, 'each attempt should report its own number')
  for (const attempt of attempts) {
    assert.equal(attempt.traceId, response.span.traceId)
    assert.notEqual(attempt.spanId, response.span.spanId)
    assert.equal(
      attempt.parentSpanId,
      response.span.spanId,
      'attempt ' + attempt.meta.attempt + ' is not a child of the span that owns the loop',
    )
  }
  for (const failed of events.events().filter((e) => e.name === 'outbound.failed')) {
    assert.notEqual(failed.spanId, response.span.spanId, 'the failure was reported in the caller span')
  }
})

test('an event can be reported under a context other than the one in flight', () => {
  const clock = createFixedClock()
  const events = createEventBus({ clock })
  const recorded = beginTrace({ idGen: ids(5) })
  const flushing = beginTrace({ idGen: ids(6) })

  // The buffer is emptied long after the work that filled it, so the event has
  // to be stamped from what the entry carries, not from what is running now.
  runInContext(flushing, () => {
    const event = events.emitWith(recorded, { name: 'audit.written', meta: { action: 'late' } })
    assert.equal(event.traceId, recorded.traceId)
    assert.equal(event.spanId, recorded.spanId)
    assert.notEqual(event.traceId, flushing.traceId, 'the explicit context was ignored')
  })

  // Passing nothing keeps the ambient context, which is what every producer
  // that is reporting live work relies on.
  runInContext(recorded, () => {
    const live = events.emitWith(undefined, { name: 'audit.live' })
    assert.equal(live.traceId, recorded.traceId)
    assert.equal(live.spanId, recorded.spanId)
  })

  // A failure the retry loop gives up on is reported under the attempt that
  // raised it, and the request it belonged to is readable from parentSpanId.
  const dead = newApp({
    transport: async () => {
      throw new AppError('downstream is down', { code: 'outbound-failed', status: 502 })
    },
  })
  return dead.app
    .request({
      method: 'POST',
      path: '/send',
      headers: USER,
      body: { url: 'https://downstream.internal/orders', attempts: 1 },
    })
    .then((refused) => {
      assert.equal(refused.status, 502)
      const [only] = dead.events.events().filter((e) => e.name === 'outbound.request')
      assert.notEqual(only.spanId, refused.span.spanId, 'the call reused the span that made it')
      assert.equal(only.parentSpanId, refused.span.spanId, 'the call is not nested under the caller')
      assert.equal(refused.body.trace.traceId, refused.span.traceId)
      assert.equal(refused.body.trace.spanId, only.spanId)
      assert.equal(refused.body.trace.parentSpanId, refused.span.spanId)
    })
})