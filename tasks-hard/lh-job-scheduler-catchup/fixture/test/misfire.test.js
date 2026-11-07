import test from 'node:test'
import assert from 'node:assert/strict'
import { createScheduler } from '../src/index.js'

const HOUR = 3600000
const MIN = 60000
const START = '2024-03-04T00:00:00.000Z'
const at = (iso) => Date.parse(iso)

const hourly = (overrides = {}) => ({
  id: 'invoice-sweep',
  pool: 'batch',
  seq: 1,
  catchup: 'all',
  misfireAfterMs: 90 * MIN,
  schedule: { kind: 'interval', everyMs: HOUR, anchor: START },
  ...overrides,
})

test('a run older than the misfire window is skipped and recorded with a reason', () => {
  const scheduler = createScheduler({ jobs: [hourly()], now: at(START) })
  const actions = scheduler.tick(at('2024-03-04T04:00:00.000Z'))

  const misfired = actions.filter((a) => a.status === 'misfired')
  assert.deepEqual(misfired.map((a) => a.iso), ['2024-03-04T01:00:00.000Z', '2024-03-04T02:00:00.000Z'])
  assert.equal(misfired[0].reason, 'misfire-window')
  assert.deepEqual(
    actions.filter((a) => a.status === 'started').map((a) => a.iso),
    ['2024-03-04T03:00:00.000Z'],
  )
})

test('misfireAfterMs: 0 means the job never misfires', () => {
  const scheduler = createScheduler({ jobs: [hourly({ misfireAfterMs: 0 })], now: at(START) })
  const actions = scheduler.tick(at('2024-03-04T06:00:00.000Z'))

  assert.equal(actions.some((a) => a.status === 'misfired'), false)
})
