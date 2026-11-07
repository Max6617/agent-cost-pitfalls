// Sub-problem 5: the background worker and the scheduler tick. Both begin their
// own work, and neither inherits a span from whatever happened to be running.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AppError,
  beginTrace,
  createApp,
  createEventBus,
  createFixedClock,
  createIdFactory,
  createScheduler,
  createWorker,
  ofKind,
  runInContext,
} from '../src/index.js'

const ids = (seed = 300) => createIdFactory({ seed, prefix: 'w-' })
const USER = { authorization: 'Bearer tok-user-42' }
const SYSTEM = { authorization: 'Bearer tok-reconciler' }

const newApp = (overrides = {}) => {
  const clock = createFixedClock()
  const events = createEventBus({ clock })
  const app = createApp({ clock, events, idGen: ids(), ...overrides })
  return { app, events, clock }
}

test('a worker job is a root span and does not continue the request trace', async () => {
  const { app, events } = newApp()
  const response = await app.request({
    method: 'POST',
    path: '/jobs',
    headers: USER,
    body: { job: 'reindex' },
  })

  const jobEvents = ofKind(events.events(), 'worker')
  assert.deepEqual(jobEvents.map((e) => e.name), ['worker.attempt', 'worker.finished'])
  for (const event of jobEvents) {
    assert.notEqual(event.traceId, response.span.traceId, 'the job continued the request trace')
    assert.equal(event.parentSpanId, undefined, 'the job hangs off the request span')
    assert.ok(typeof event.traceId === 'string' && event.traceId.length > 0)
    assert.ok(typeof event.spanId === 'string' && event.spanId.length > 0)
  }
  assert.equal(new Set(jobEvents.map((e) => e.traceId)).size, 1, 'one job is one trace')
})

test('a scheduler tick is a root and each job it starts is a root of its own', async () => {
  const { app, events } = newApp()
  const response = await app.request({
    method: 'POST',
    path: '/scheduler/tick',
    headers: SYSTEM,
    body: { now: 4_000 },
  })
  assert.equal(response.status, 200)

  const [tick] = ofKind(events.events(), 'scheduler')
  assert.equal(tick.name, 'scheduler.tick')
  assert.equal(tick.parentSpanId, undefined)
  assert.ok(typeof tick.traceId === 'string' && tick.traceId.length > 0)
  assert.notEqual(tick.traceId, response.span.traceId)

  const jobs = ofKind(events.events(), 'worker')
  assert.equal(jobs.length, 4, 'two jobs should report an attempt and a finish each')
  const traces = new Set(jobs.map((e) => e.traceId))
  assert.equal(traces.size, 2, 'the two jobs shared a trace')
  for (const event of jobs) {
    assert.notEqual(event.traceId, tick.traceId, 'a job inherited the tick trace')
    assert.equal(event.parentSpanId, undefined)
  }
})

test('a job that fails reports every attempt in its own trace', async () => {
  const { app, events } = newApp({
    jobHandler: async () => {
      throw new AppError('no capacity', { code: 'retryable', status: 503 })
    },
  })
  const response = await app.request({
    method: 'POST',
    path: '/jobs',
    headers: USER,
    body: { job: 'reindex' },
  })

  assert.equal(response.status, 503, 'the failed job should reach the client as a failure')
  const jobEvents = ofKind(events.events(), 'worker')
  const failed = jobEvents.filter((e) => e.name === 'worker.failed')
  assert.equal(failed.length, 3, 'a failing job should be attempted three times')
  for (const event of jobEvents) {
    assert.equal(event.parentSpanId, undefined)
    assert.notEqual(event.traceId, response.span.traceId, 'the job ran inside the request trace')
  }
  assert.deepEqual(jobEvents.map((e) => e.meta.attempt), [1, 1, 2, 2, 3, 3])
  assert.ok(jobEvents.every((e) => e.meta.job === 'reindex'))
  assert.equal(new Set(jobEvents.map((e) => e.traceId)).size, 3, 'each attempt should be its own trace')
})

test('the error a job raised keeps the trace of the job that raised it', async () => {
  const thrown = []
  const { app, events } = newApp({
    jobHandler: async () => {
      const err = new AppError('downstream refused the batch', { code: 'outbound-failed', status: 502 })
      thrown.push(err)
      throw err
    },
  })
  const response = await app.request({
    method: 'POST',
    path: '/jobs',
    headers: USER,
    body: { job: 'flush' },
  })

  assert.equal(response.status, 502)
  assert.equal(thrown.length, 3, 'the job should have been attempted three times')
  const [attempt] = ofKind(events.events(), 'worker')
  assert.equal(attempt.name, 'worker.attempt')
  assert.equal(thrown[0].context.traceId, attempt.traceId, 'the error lost the trace it was raised under')
  assert.equal(thrown[0].context.spanId, attempt.spanId)
  assert.notEqual(thrown[0].context.traceId, response.span.traceId)
})

test('the worker reports every attempt and each attempt is its own trace', async () => {
  const clock = createFixedClock()
  const events = createEventBus({ clock })
  let calls = 0
  const worker = createWorker({
    handler: async () => {
      calls += 1
      if (calls < 3) throw new AppError('busy', { code: 'retryable' })
      return { ok: true }
    },
    events,
  })

  const value = await worker.run({ name: 'flush', payload: { shard: 2 } })
  assert.deepEqual(value, { ok: true })
  const jobs = ofKind(events.events(), 'worker')
  assert.deepEqual(jobs.map((e) => e.meta.attempt), [1, 1, 2, 2, 3, 3])
  assert.ok(jobs.every((e) => e.meta.job === 'flush'))
  assert.equal(new Set(jobs.map((e) => e.traceId)).size, 3, 'each attempt should be its own trace')
  assert.ok(jobs.every((e) => e.parentSpanId === undefined))

  // A job takes nothing from the frame that started it: run while a span is in
  // flight, it still begins its own trace.
  const outer = beginTrace({ idGen: ids(9) })
  await runInContext(outer, () => worker.run({ name: 'compact' }))
  const later = ofKind(events.events(), 'worker').filter((e) => e.meta.job === 'compact')
  assert.ok(later.length >= 2)
  for (const event of later) {
    assert.notEqual(event.traceId, outer.traceId, 'the job inherited the caller trace')
    assert.equal(event.parentSpanId, undefined)
  }
})
