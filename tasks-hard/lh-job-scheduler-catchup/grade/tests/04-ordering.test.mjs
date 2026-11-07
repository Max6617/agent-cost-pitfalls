// Sub-problem 4: order, priority and pools. Cases 3 and 4 are interaction
// cases: a slot that frees up only matters if the run that was waiting for it is
// still owed, which is the watermark's business.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createScheduler, loadConfig, loadOffsets } from '../src/index.js'

const HOUR = 3600000
const at = (iso) => Date.parse(iso)
const iso = (ms) => new Date(ms).toISOString()
const T0 = '2024-03-04T00:00:00.000Z'
const T1 = '2024-03-04T01:00:00.000Z'

const job = (id, extra = {}) => ({
  id,
  pool: 'batch',
  seq: 1,
  priority: 0,
  catchup: 'all',
  misfireAfterMs: 0,
  maxAttempts: 1,
  schedule: { kind: 'interval', everyMs: HOUR, anchor: T0 },
  ...extra,
})

const make = (jobs, pools) => createScheduler({
  jobs,
  now: at(T0),
  config: { ...loadConfig(), pools },
  offsets: loadOffsets(),
})

const triples = (actions) => actions.map((action) => [action.jobId, action.iso, action.status])

test('the highest priority due job takes the last free slot and the rest defer', () => {
  const scheduler = make([
    job('gamma', { priority: 1, seq: 30 }),
    job('alpha', { priority: 9, seq: 10 }),
    job('beta', { priority: 5, seq: 20 }),
  ], { batch: 1 })

  const actions = scheduler.tick(at(T1))
  assert.deepEqual(triples(actions.filter((action) => action.status === 'started')), [
    ['alpha', '2024-03-04T01:00:00.000Z', 'started'],
  ])
  assert.deepEqual(triples(actions.filter((action) => action.status === 'deferred')), [
    ['beta', '2024-03-04T01:00:00.000Z', 'deferred'],
    ['gamma', '2024-03-04T01:00:00.000Z', 'deferred'],
  ])
  for (const action of actions) {
    if (action.status === 'deferred') assert.equal(action.reason, 'pool-full')
  }
})

test('equal priorities fall back to submission order and then to the job id', () => {
  const scheduler = make([
    job('c', { seq: 30 }),
    job('zulu', { seq: 5 }),
    job('a', { seq: 10 }),
    job('alpha', { seq: 5 }),
    job('b', { seq: 20 }),
  ], { batch: 8 })

  const actions = scheduler.tick(at(T1))
  assert.deepEqual(actions.map((action) => action.jobId), ['alpha', 'zulu', 'a', 'b', 'c'])
  assert.deepEqual(actions.map((action) => action.status), ['started', 'started', 'started', 'started', 'started'])
})

test('a run deferred by a full pool starts later, at the instant it was scheduled for', () => {
  const scheduler = make([
    job('alpha', { priority: 9, seq: 10 }),
    job('beta', { priority: 1, seq: 20 }),
  ], { batch: 1 })

  const first = scheduler.tick(at(T1))
  assert.deepEqual(triples(first.filter((action) => action.status === 'started')), [
    ['alpha', '2024-03-04T01:00:00.000Z', 'started'],
  ])
  assert.deepEqual(triples(first.filter((action) => action.jobId === 'beta')), [
    ['beta', '2024-03-04T01:00:00.000Z', 'deferred'],
  ])

  scheduler.finish('alpha', { at: at('2024-03-04T01:00:30.000Z'), ok: true })
  const second = scheduler.tick(at('2024-03-04T01:00:30.000Z'))

  assert.deepEqual(triples(second), [['beta', '2024-03-04T01:00:00.000Z', 'started']])
  assert.equal(iso(scheduler.state('beta').watermark), '2024-03-04T01:00:00.000Z')
})

test('a job already running defers its own next run while its pool defers everyone else', () => {
  const scheduler = make([
    job('alpha', { priority: 9, seq: 10 }),
    job('beta', { priority: 1, seq: 20 }),
  ], { batch: 1 })

  scheduler.tick(at(T1))
  const second = scheduler.tick(at('2024-03-04T02:00:00.000Z'))

  assert.deepEqual(triples(second.filter((action) => action.status === 'started')), [])
  assert.deepEqual(second.map((action) => [action.jobId, action.reason]), [
    ['alpha', 'job-running'],
    ['beta', 'pool-full'],
    ['beta', 'pool-full'],
  ])
  assert.equal(iso(scheduler.state('alpha').watermark), '2024-03-04T01:00:00.000Z')
  assert.equal(iso(scheduler.state('beta').watermark), T0)
})
