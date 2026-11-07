import test from 'node:test'
import assert from 'node:assert/strict'
import { createScheduler } from '../src/index.js'

const HOUR = 3600000
const START = '2024-03-04T00:00:00.000Z'
const at = (iso) => Date.parse(iso)

const hourly = (overrides = {}) => ({
  id: 'invoice-sweep',
  pool: 'batch',
  seq: 1,
  catchup: 'all',
  schedule: { kind: 'interval', everyMs: HOUR, anchor: START },
  ...overrides,
})

const startedIso = (actions) => actions.filter((a) => a.status === 'started').map((a) => a.iso)

test('catch-up "last" replays the newest missed run and coalesces the rest', () => {
  const scheduler = createScheduler({ jobs: [hourly({ catchup: 'last' })], now: at(START) })
  const actions = scheduler.tick(at('2024-03-04T03:00:00.000Z'))

  assert.deepEqual(startedIso(actions), ['2024-03-04T03:00:00.000Z'])
  assert.deepEqual(
    actions.filter((a) => a.status === 'coalesced').map((a) => a.iso),
    ['2024-03-04T01:00:00.000Z', '2024-03-04T02:00:00.000Z'],
  )
})

test('catch-up "none" starts nothing at all', () => {
  const scheduler = createScheduler({ jobs: [hourly({ catchup: 'none' })], now: at(START) })
  const actions = scheduler.tick(at('2024-03-04T03:00:00.000Z'))

  assert.equal(actions.some((a) => a.status === 'started'), false)
  assert.deepEqual(actions.map((a) => a.status), ['dropped', 'dropped', 'dropped'])
})

test('catch-up "all" works through the backlog from the oldest run', () => {
  const scheduler = createScheduler({ jobs: [hourly()], now: at(START) })
  const actions = scheduler.tick(at('2024-03-04T03:00:00.000Z'))

  assert.deepEqual(startedIso(actions), ['2024-03-04T01:00:00.000Z'])
})
