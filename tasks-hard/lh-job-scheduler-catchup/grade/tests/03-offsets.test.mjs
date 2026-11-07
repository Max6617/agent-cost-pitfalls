// Sub-problem 3: fixed-offset local schedules. Case 4 is an interaction case:
// the instant a zoned run lands on is only half of it - the watermark has to
// land there too, or the next tick will not find the run again.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createScheduler, loadConfig, loadOffsets, offsets as offsetHelpers, schedule } from '../src/index.js'

const at = (iso) => Date.parse(iso)
const iso = (ms) => new Date(ms).toISOString()

const table = loadOffsets()
const berlin = { kind: 'local-daily', zone: 'Europe/Berlin', at: '05:30' }

const job = (extra = {}) => ({
  id: 'rollup',
  pool: 'batch',
  seq: 1,
  priority: 0,
  catchup: 'all',
  misfireAfterMs: 0,
  maxAttempts: 1,
  schedule: { ...berlin },
  ...extra,
})

test('a published local time resolves to the absolute instant it happens at', () => {
  assert.equal(iso(offsetHelpers.localToEpoch(table, 'Europe/Berlin', '2024-03-30T05:30:00.000')), '2024-03-30T04:30:00.000Z')
  assert.equal(iso(offsetHelpers.localToEpoch(table, 'America/New_York', '2024-03-30T05:30:00.000')), '2024-03-30T09:30:00.000Z')
  assert.equal(iso(offsetHelpers.localToEpoch(table, 'Asia/Kolkata', '2024-03-30T05:30:00.000')), '2024-03-30T00:00:00.000Z')
  assert.equal(offsetHelpers.epochToLocal(table, 'Europe/Berlin', at('2024-03-30T04:30:00.000Z')), '2024-03-30T05:30:00.000')
  assert.equal(offsetHelpers.offsetAt(table, 'Europe/Berlin', at('2024-03-30T04:30:00.000Z')), 60)
  assert.equal(offsetHelpers.offsetAt(table, 'Europe/Berlin', at('2024-04-01T04:30:00.000Z')), 120)
})

test('a local-daily job runs once per local day, and its instant moves when the offset does', () => {
  const instants = schedule.instantsBetween(berlin, at('2024-03-29T00:00:00.000Z'), at('2024-04-02T00:00:00.000Z'), table)
  assert.deepEqual(instants.map(iso), [
    '2024-03-29T04:30:00.000Z',
    '2024-03-30T04:30:00.000Z',
    '2024-03-31T03:30:00.000Z',
    '2024-04-01T03:30:00.000Z',
  ])
})

test('a wall clock the local calendar skips resolves forward, one it repeats resolves to the first', () => {
  assert.equal(iso(offsetHelpers.localToEpoch(table, 'Europe/Berlin', '2024-03-31T02:30:00.000')), '2024-03-31T01:30:00.000Z')
  assert.equal(iso(offsetHelpers.localToEpoch(table, 'Europe/Berlin', '2024-10-27T02:30:00.000')), '2024-10-27T00:30:00.000Z')
  assert.throws(() => offsetHelpers.localToEpoch(table, 'Mars/Olympus', '2024-03-30T05:30:00.000'), RangeError)
})

test('a zoned job caught up across the change starts at the resolved instant and settles there', () => {
  const scheduler = createScheduler({
    jobs: [job()],
    now: at('2024-03-30T00:00:00.000Z'),
    config: { ...loadConfig(), pools: { batch: 8 } },
    offsets: table,
  })
  const actions = scheduler.tick(at('2024-03-31T12:00:00.000Z'))

  assert.deepEqual(actions.filter((action) => action.status === 'started').map((action) => action.iso), [
    '2024-03-30T04:30:00.000Z',
  ])
  assert.deepEqual(actions.filter((action) => action.status === 'deferred').map((action) => action.iso), [
    '2024-03-31T03:30:00.000Z',
  ])
  assert.equal(iso(scheduler.state('rollup').watermark), '2024-03-30T04:30:00.000Z')

  scheduler.finish('rollup', { at: at('2024-03-31T12:05:00.000Z'), ok: true })
  const next = scheduler.tick(at('2024-03-31T12:05:00.000Z'))
  assert.deepEqual(next.filter((action) => action.status === 'started').map((action) => action.iso), [
    '2024-03-31T03:30:00.000Z',
  ])
})
