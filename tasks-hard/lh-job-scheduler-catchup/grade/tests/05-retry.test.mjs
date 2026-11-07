// Sub-problem 5: failure, backoff and parking. Case 4 is an interaction case:
// a retry sequence that runs long enough for a scheduled run to come due leaves
// that run owed, and the watermark has to remember it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { backoff, createScheduler, loadConfig, loadOffsets } from '../src/index.js'

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
  misfireAfterMs: 0,
  maxAttempts: 3,
  backoffMs: 60 * 1000,
  maxBackoffMs: 15 * MIN,
  schedule: { kind: 'interval', everyMs: HOUR, anchor: '2024-03-04T00:00:00.000Z' },
  ...extra,
})

const make = (overrides = {}) => createScheduler({
  jobs: [job(overrides)],
  now: at('2024-03-04T00:00:00.000Z'),
  config: { ...loadConfig(), pools: { batch: 8 } },
  offsets: loadOffsets(),
})

const triples = (actions) => actions.map((action) => [action.iso, action.status, action.attempt])

test('the first retry waits backoffMs and keeps the instant of the run it is retrying', () => {
  const scheduler = make()
  assert.deepEqual(triples(scheduler.tick(at('2024-03-04T01:00:00.000Z'))), [
    ['2024-03-04T01:00:00.000Z', 'started', 1],
  ])

  scheduler.finish('rollup', { at: at('2024-03-04T01:00:30.000Z'), ok: false })
  assert.equal(iso(scheduler.state('rollup').pendingRetryAt), '2024-03-04T01:01:30.000Z')

  assert.deepEqual(scheduler.tick(at('2024-03-04T01:01:29.000Z')), [])
  assert.deepEqual(triples(scheduler.tick(at('2024-03-04T01:01:30.000Z'))), [
    ['2024-03-04T01:00:00.000Z', 'started', 2],
  ])
})

test('the delay doubles, the ceiling holds, and maxAttempts counts every attempt', () => {
  const subject = job()
  assert.equal(backoff.backoffFor(subject, 1), 0)
  assert.equal(backoff.backoffFor(subject, 2), MIN)
  assert.equal(backoff.backoffFor(subject, 3), 2 * MIN)
  assert.equal(backoff.backoffFor(subject, 4), 4 * MIN)
  assert.equal(backoff.backoffFor({ ...subject, maxBackoffMs: 90000 }, 4), 90000)
  assert.equal(backoff.maxAttempts(subject), 3)
  assert.equal(backoff.maxAttempts({}), 1)
  assert.equal(backoff.maxAttempts({ maxAttempts: 1 }), 1)
})

test('a run is attempted maxAttempts times and the job is parked when they are gone', () => {
  const scheduler = make()
  scheduler.tick(at('2024-03-04T01:00:00.000Z'))
  scheduler.finish('rollup', { at: at('2024-03-04T01:00:10.000Z'), ok: false })

  const secondAttempt = scheduler.state('rollup').pendingRetryAt
  assert.notEqual(secondAttempt, null, 'the second attempt is still owed')
  assert.deepEqual(triples(scheduler.tick(secondAttempt)).map((entry) => entry[2]), [2])
  scheduler.finish('rollup', { at: at('2024-03-04T01:01:20.000Z'), ok: false })

  const thirdAttempt = scheduler.state('rollup').pendingRetryAt
  assert.notEqual(thirdAttempt, null, 'the third attempt is still owed')
  assert.deepEqual(triples(scheduler.tick(thirdAttempt)).map((entry) => entry[2]), [3])
  scheduler.finish('rollup', { at: at('2024-03-04T01:03:30.000Z'), ok: false })

  assert.equal(scheduler.state('rollup').parked, true)
  assert.equal(scheduler.state('rollup').pendingRetryAt, null)
  const last = scheduler.history().at(-1)
  assert.equal(last.status, 'parked')
  assert.equal(last.reason, 'attempts-exhausted')
  assert.equal(last.attempt, 3)
  assert.deepEqual(scheduler.tick(at('2024-03-04T04:00:00.000Z')), [])
})

test('a run that comes due while a retry is pending is still owed when the retry succeeds', () => {
  const scheduler = make()
  scheduler.tick(at('2024-03-04T01:00:00.000Z'))
  scheduler.finish('rollup', { at: at('2024-03-04T01:00:10.000Z'), ok: false })

  const retry = scheduler.tick(at('2024-03-04T02:30:00.000Z'))
  assert.deepEqual(triples(retry), [
    ['2024-03-04T01:00:00.000Z', 'started', 2],
    ['2024-03-04T02:00:00.000Z', 'deferred', 0],
  ])
  assert.equal(retry[retry.length - 1].reason, 'retry-pending')
  assert.equal(iso(scheduler.state('rollup').watermark), '2024-03-04T01:00:00.000Z')

  scheduler.finish('rollup', { at: at('2024-03-04T02:35:00.000Z'), ok: true })
  const next = scheduler.tick(at('2024-03-04T02:35:00.000Z'))

  assert.deepEqual(triples(next), [['2024-03-04T02:00:00.000Z', 'started', 1]])
  assert.equal(iso(scheduler.state('rollup').watermark), '2024-03-04T02:00:00.000Z')
})
