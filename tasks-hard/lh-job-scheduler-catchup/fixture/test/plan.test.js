import test from 'node:test'
import assert from 'node:assert/strict'
import { createScheduler, schedule } from '../src/index.js'

const HOUR = 3600000
const START = '2024-03-04T00:00:00.000Z'
const at = (iso) => Date.parse(iso)

const hourly = (overrides = {}) => ({
  id: 'report-refresh',
  pool: 'report',
  seq: 1,
  catchup: 'all',
  schedule: { kind: 'interval', everyMs: HOUR, anchor: START },
  ...overrides,
})

test('the plan lists the instants the job will actually be offered at', () => {
  const scheduler = createScheduler({ jobs: [hourly()], now: at('2024-03-04T00:30:00.000Z') })
  const plan = scheduler.planNext(at('2024-03-04T00:30:00.000Z'), 2 * HOUR, { perJob: 2 })

  assert.deepEqual(plan.map((entry) => entry.iso), [
    '2024-03-04T01:00:00.000Z',
    '2024-03-04T02:00:00.000Z',
  ])
})

test('an interval schedule is its anchor plus whole multiples of everyMs', () => {
  const instants = schedule.instantsBetween(
    { kind: 'interval', everyMs: HOUR, anchor: START },
    at('2024-03-04T00:30:00.000Z'),
    at('2024-03-04T03:30:00.000Z'),
  )
  assert.deepEqual(instants.map((instant) => new Date(instant).toISOString()), [
    '2024-03-04T01:00:00.000Z',
    '2024-03-04T02:00:00.000Z',
    '2024-03-04T03:00:00.000Z',
  ])
})
