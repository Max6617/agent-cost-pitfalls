import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createApp,
  createIdFactory,
  createEventBus,
  createFixedClock,
  createWorker,
  createAuditWriter,
  runInContext,
  beginTrace,
  fields,
  ofKind,
} from '../src/index.js'

const newBus = () => {
  const clock = createFixedClock()
  return { clock, events: createEventBus({ clock }) }
}

test('a worker job starts a trace of its own', async () => {
  const { events } = newBus()
  const app = createApp({ events, idGen: createIdFactory({ seed: 0, prefix: 'v-' }) })
  const response = await app.request({
    method: 'POST',
    path: '/jobs',
    headers: { authorization: 'Bearer tok-user-42' },
    body: { job: 'reindex' },
  })

  const job = ofKind(events.events(), 'worker')
  assert.ok(job.length >= 2, 'expected worker events')
  for (const event of job) {
    assert.notEqual(event.traceId, response.span.traceId, 'the job continued the request trace')
  }
})

test('a scheduler tick and its jobs are separate traces', async () => {
  const { events } = newBus()
  const app = createApp({ events, idGen: createIdFactory({ seed: 0, prefix: 'v-' }) })
  const response = await app.request({
    method: 'POST',
    path: '/scheduler/tick',
    headers: { authorization: 'Bearer tok-reconciler' },
    body: {},
  })

  const [tick] = ofKind(events.events(), 'scheduler')
  assert.ok(typeof tick.traceId === 'string' && tick.traceId.length > 0)
  assert.equal(tick.parentSpanId, undefined)
  assert.notEqual(tick.traceId, response.span.traceId)

  for (const event of ofKind(events.events(), 'worker')) {
    assert.notEqual(event.traceId, tick.traceId, 'a job inherited the tick trace')
  }
})

test('a worker job is not adopted by a span that happens to be running', async () => {
  const { events } = newBus()
  const worker = createWorker({ handler: async () => ({ ok: true }), events })
  const outer = beginTrace({ idGen: createIdFactory({ seed: 5, prefix: 'v-' }) })

  await runInContext(outer, () => worker.run({ name: 'compact' }))

  for (const event of ofKind(events.events(), 'worker')) {
    assert.notEqual(event.traceId, outer.traceId)
    assert.equal(event.parentSpanId, undefined)
  }
})

test('an audit entry is written under the span that recorded it', () => {
  const { events } = newBus()
  const writer = createAuditWriter({ events })
  const request = beginTrace({ idGen: createIdFactory({ seed: 1, prefix: 'v-' }) })

  runInContext(request, () => {
    writer.record('record.read.requested', { id: 'r-1' })
  })
  assert.equal(writer.pending, 1)
  writer.flush()

  const [written] = ofKind(events.events(), 'audit')
  assert.deepEqual(fields({ traceId: written.traceId, spanId: written.spanId, parentSpanId: written.parentSpanId }), {
    traceId: request.traceId,
    spanId: request.spanId,
    parentSpanId: request.parentSpanId,
  })
})

test('audit entries are written oldest first', () => {
  const { events } = newBus()
  const writer = createAuditWriter({ events })
  const span = beginTrace({ idGen: createIdFactory({ seed: 2, prefix: 'v-' }) })

  runInContext(span, () => {
    writer.record('a.first', { n: 1 })
    writer.record('b.second', { n: 2 })
    writer.record('c.third', { n: 3 })
  })
  writer.flush()

  const seqs = ofKind(events.events(), 'audit').map((e) => e.meta.seq)
  assert.deepEqual(seqs, [1, 2, 3])
})
