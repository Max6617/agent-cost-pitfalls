// Sub-problem 6: the plan and the history. Cases 2 and 3 are interaction cases:
// the plan has to carry a pending retry, and it has to be reconcilable with what
// the policy and the watermark actually did.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createScheduler, loadConfig, loadOffsets } from '../src/index.js'

const HOUR = 3600000
const HALF = 1800000
const at = (iso) => Date.parse(iso)
const iso = (ms) => new Date(ms).toISOString()

const job = (id, extra = {}) => ({
  id,
  pool: 'batch',
  seq: 1,
  priority: 0,
  catchup: 'all',
  misfireAfterMs: 0,
  maxAttempts: 1,
  schedule: { kind: 'interval', everyMs: HOUR, anchor: '2024-03-04T00:00:00.000Z' },
  ...extra,
})

const make = (jobs, now) => createScheduler({
  jobs,
  now: at(now),
  config: { ...loadConfig(), pools: { batch: 8 } },
  offsets: loadOffsets(),
})

test('the plan lists the schedule\'s instants, not intervals stepped from the tick', () => {
  const scheduler = make([job('rollup')], '2024-03-04T00:30:00.000Z')
  const plan = scheduler.planNext(at('2024-03-04T00:30:00.000Z'), 2 * HOUR, { perJob: 3 })

  assert.deepEqual(plan.map((entry) => entry.iso), [
    '2024-03-04T01:00:00.000Z',
    '2024-03-04T02:00:00.000Z',
  ])
  assert.deepEqual(plan.map((entry) => [entry.jobId, entry.overdue, entry.retry]), [
    ['rollup', false, false],
    ['rollup', false, false],
  ])
})

test('a run waiting on a retry leads the plan, at the instant its next attempt is due', () => {
  const scheduler = make([job('rollup', { maxAttempts: 3, backoffMs: 60000 })], '2024-03-04T00:00:00.000Z')
  scheduler.tick(at('2024-03-04T01:00:00.000Z'))
  scheduler.finish('rollup', { at: at('2024-03-04T01:00:30.000Z'), ok: false })

  const plan = scheduler.planNext(at('2024-03-04T01:00:40.000Z'), 2 * HOUR, { perJob: 3 })
  assert.deepEqual(plan.map((entry) => [entry.iso, entry.retry, entry.attempt]), [
    ['2024-03-04T01:01:30.000Z', true, 2],
    ['2024-03-04T02:00:00.000Z', false, 1],
    ['2024-03-04T03:00:00.000Z', false, 1],
  ])
})

test('the plan and the history describe the same backlog', () => {
  const scheduler = make([job('rollup', { catchup: 'last' })], '2024-03-04T00:30:00.000Z')
  const plan = scheduler.planNext(at('2024-03-04T00:30:00.000Z'), 3 * HOUR, { perJob: 3 })
  const planned = plan.map((entry) => entry.iso)

  const actions = scheduler.tick(at('2024-03-04T03:00:00.000Z'))
  const decided = actions.map((action) => action.iso)

  assert.deepEqual(planned, ['2024-03-04T01:00:00.000Z', '2024-03-04T02:00:00.000Z', '2024-03-04T03:00:00.000Z'])
  assert.deepEqual(decided, planned)
  assert.deepEqual(actions.map((action) => action.status), ['coalesced', 'coalesced', 'started'])
})

test('a settled run is not in the plan, and overlapping jobs are planned per job', () => {
  const settled = make([job('rollup')], '2024-03-04T00:00:00.000Z')
  settled.tick(at('2024-03-04T01:00:00.000Z'))
  settled.finish('rollup', { at: at('2024-03-04T01:05:00.000Z'), ok: true })
  assert.deepEqual(settled.planNext(at('2024-03-04T01:05:00.000Z'), 2 * HOUR, { perJob: 3 }).map((entry) => entry.iso), [
    '2024-03-04T02:00:00.000Z',
    '2024-03-04T03:00:00.000Z',
  ])

  const two = make([
    job('rollup', { seq: 1 }),
    job('ledger', { seq: 2, schedule: { kind: 'interval', everyMs: HALF, anchor: '2024-03-04T00:00:00.000Z' } }),
  ], '2024-03-04T00:00:00.000Z')
  const plan = two.planNext(at('2024-03-04T00:00:00.000Z'), 2 * HOUR, { perJob: 2 })

  assert.equal(plan.filter((entry) => entry.jobId === 'rollup').length, 2)
  assert.equal(plan.filter((entry) => entry.jobId === 'ledger').length, 2)
  const instants = plan.map((entry) => entry.at)
  assert.deepEqual(instants, [...instants].sort((a, b) => a - b))
  assert.deepEqual([...new Set(plan.map((entry) => entry.iso))].sort(), [
    '2024-03-04T00:30:00.000Z',
    '2024-03-04T01:00:00.000Z',
    '2024-03-04T02:00:00.000Z',
  ].sort())
})
