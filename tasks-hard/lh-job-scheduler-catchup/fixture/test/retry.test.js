import test from 'node:test'
import assert from 'node:assert/strict'
import { createScheduler } from '../src/index.js'

const HOUR = 3600000
const START = '2024-03-04T00:00:00.000Z'
const at = (iso) => Date.parse(iso)
const ID = 'invoice-sweep'

const hourly = (overrides = {}) => ({
  id: ID,
  pool: 'batch',
  seq: 1,
  catchup: 'all',
  maxAttempts: 3,
  backoffMs: 60000,
  maxBackoffMs: 600000,
  schedule: { kind: 'interval', everyMs: HOUR, anchor: START },
  ...overrides,
})

test('a failed run is retried after backoffMs, at the instant of the run it retries', () => {
  const scheduler = createScheduler({ jobs: [hourly()], now: at(START) })
  scheduler.tick(at('2024-03-04T01:00:00.000Z'))
  scheduler.finish(ID, { at: at('2024-03-04T01:00:30.000Z'), ok: false })

  assert.equal(scheduler.state(ID).pendingRetryAt, at('2024-03-04T01:01:30.000Z'))
  assert.deepEqual(scheduler.tick(at('2024-03-04T01:01:29.000Z')), [])

  const retry = scheduler.tick(at('2024-03-04T01:01:30.000Z'))
  assert.deepEqual(retry.map((a) => [a.iso, a.status, a.attempt]), [
    ['2024-03-04T01:00:00.000Z', 'started', 2],
  ])
})

test('a run is attempted maxAttempts times and then the job is parked', () => {
  const scheduler = createScheduler({ jobs: [hourly()], now: at(START) })
  const attempts = []

  scheduler.tick(at('2024-03-04T01:00:00.000Z'))
  attempts.push(1)
  scheduler.finish(ID, { at: at('2024-03-04T01:00:10.000Z'), ok: false })

  const second = scheduler.state(ID).pendingRetryAt
  assert.notEqual(second, null, 'a second attempt is still owed')
  scheduler.tick(second)
  attempts.push(2)
  scheduler.finish(ID, { at: at('2024-03-04T01:01:30.000Z'), ok: false })

  const third = scheduler.state(ID).pendingRetryAt
  assert.notEqual(third, null, 'a third attempt is still owed')
  scheduler.tick(third)
  attempts.push(3)
  scheduler.finish(ID, { at: at('2024-03-04T01:03:40.000Z'), ok: false })

  assert.deepEqual(attempts, [1, 2, 3])
  assert.equal(scheduler.state(ID).parked, true)
  assert.equal(scheduler.history().at(-1).reason, 'attempts-exhausted')
})
