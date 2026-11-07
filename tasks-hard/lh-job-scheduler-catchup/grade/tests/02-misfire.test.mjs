// Sub-problem 2: the misfire window, and what the policy behind it is allowed
// to touch. Case 4 is an interaction case: a run can be too old to replay and
// the catch-up policy still has to be applied to whatever is left.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createScheduler, loadConfig, loadOffsets } from '../src/index.js'

const HOUR = 3600000
const MIN = 60000
const at = (iso) => Date.parse(iso)
const iso = (ms) => new Date(ms).toISOString()

const job = (extra = {}) => ({
  id: 'rollup',
  pool: 'batch',
  seq: 1,
  priority: 0,
  catchup: 'all',
  misfireAfterMs: 90 * MIN,
  maxAttempts: 1,
  schedule: { kind: 'interval', everyMs: HOUR, anchor: '2024-03-04T00:00:00.000Z' },
  ...extra,
})

const make = (overrides = {}) => createScheduler({
  jobs: [job(overrides)],
  now: at('2024-03-04T00:00:00.000Z'),
  config: { ...loadConfig(), pools: { batch: 8 } },
  offsets: loadOffsets(),
})

const pairs = (actions) => actions.map((action) => [action.iso, action.status])
const withReason = (actions, status) => actions
  .filter((action) => action.status === status)
  .map((action) => [action.iso, action.reason])

test('a run older than the misfire window is recorded and skipped, and the backlog carries on', () => {
  const scheduler = make()
  const actions = scheduler.tick(at('2024-03-04T04:00:00.000Z'))

  assert.deepEqual(withReason(actions, 'misfired'), [
    ['2024-03-04T01:00:00.000Z', 'misfire-window'],
    ['2024-03-04T02:00:00.000Z', 'misfire-window'],
  ])
  assert.deepEqual(pairs(actions.filter((action) => action.status === 'started')), [
    ['2024-03-04T03:00:00.000Z', 'started'],
  ])
  assert.deepEqual(pairs(actions.filter((action) => action.status === 'deferred')), [
    ['2024-03-04T04:00:00.000Z', 'deferred'],
  ])
  assert.equal(iso(scheduler.state('rollup').watermark), '2024-03-04T03:00:00.000Z')
})

test('a run exactly misfireAfterMs late is still on time, and one millisecond more is not', () => {
  const onTime = make()
  const onTimeActions = onTime.tick(at('2024-03-04T03:30:00.000Z'))

  assert.deepEqual(pairs(onTimeActions.filter((action) => action.status !== 'misfired')), [
    ['2024-03-04T02:00:00.000Z', 'started'],
    ['2024-03-04T03:00:00.000Z', 'deferred'],
  ])
  assert.deepEqual(pairs(onTimeActions.filter((action) => action.status === 'misfired')), [
    ['2024-03-04T01:00:00.000Z', 'misfired'],
  ])

  const late = make({ misfireAfterMs: 90 * MIN - 1 })
  assert.deepEqual(pairs(late.tick(at('2024-03-04T03:30:00.000Z')).filter((action) => action.status === 'misfired')), [
    ['2024-03-04T01:00:00.000Z', 'misfired'],
    ['2024-03-04T02:00:00.000Z', 'misfired'],
  ])
})

test('misfireAfterMs: 0 switches the window off however late the run is found', () => {
  const scheduler = make({ misfireAfterMs: 0 })
  const actions = scheduler.tick(at('2024-03-04T05:00:00.000Z'))

  assert.equal(actions.some((action) => action.status === 'misfired'), false)
  assert.deepEqual(pairs(actions.filter((action) => action.status === 'started')), [
    ['2024-03-04T01:00:00.000Z', 'started'],
  ])
})

test('a policy of "last" coalesces nothing once the older runs have already misfired', () => {
  const scheduler = make({ catchup: 'last', misfireAfterMs: 45 * MIN })
  const actions = scheduler.tick(at('2024-03-04T03:30:00.000Z'))

  assert.deepEqual(withReason(actions, 'misfired'), [
    ['2024-03-04T01:00:00.000Z', 'misfire-window'],
    ['2024-03-04T02:00:00.000Z', 'misfire-window'],
  ])
  assert.deepEqual(pairs(actions.filter((action) => action.status === 'started')), [
    ['2024-03-04T03:00:00.000Z', 'started'],
  ])
  assert.deepEqual(actions.filter((action) => action.status === 'coalesced'), [])
  assert.equal(iso(scheduler.state('rollup').watermark), '2024-03-04T03:00:00.000Z')
})
