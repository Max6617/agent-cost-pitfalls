// Sub-problem 1: the catch-up policy, and the watermark it is allowed to move.
// Cases 3 and 4 are interaction cases: the policy only decides, the watermark
// and the pool decide whether the decision survives the next tick.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createScheduler, loadConfig, loadOffsets } from '../src/index.js'

const HOUR = 3600000
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

const make = (jobs, now, pools = { batch: 8 }) => createScheduler({
  jobs,
  now: at(now),
  config: { ...loadConfig(), pools },
  offsets: loadOffsets(),
})

const pairs = (actions) => actions.map((action) => [action.iso, action.status])

test('catch-up "last" coalesces the older runs and starts only the newest', () => {
  const scheduler = make([job('rollup', { catchup: 'last' })], '2024-03-04T00:00:00.000Z')
  const actions = scheduler.tick(at('2024-03-04T03:00:00.000Z'))

  assert.deepEqual(pairs(actions.filter((action) => action.status === 'started')), [
    ['2024-03-04T03:00:00.000Z', 'started'],
  ])
  assert.deepEqual(pairs(actions.filter((action) => action.status === 'coalesced')), [
    ['2024-03-04T01:00:00.000Z', 'coalesced'],
    ['2024-03-04T02:00:00.000Z', 'coalesced'],
  ])
  for (const action of actions) {
    if (action.status === 'coalesced') assert.equal(action.reason, 'catchup-last')
  }
  assert.equal(scheduler.state('rollup').watermark, at('2024-03-04T03:00:00.000Z'))
})

test('catch-up "none" drops every missed run and starts nothing at all', () => {
  const scheduler = make([job('rollup', { catchup: 'none' })], '2024-03-04T00:00:00.000Z')
  const actions = scheduler.tick(at('2024-03-04T03:00:00.000Z'))

  assert.deepEqual(pairs(actions), [
    ['2024-03-04T01:00:00.000Z', 'dropped'],
    ['2024-03-04T02:00:00.000Z', 'dropped'],
    ['2024-03-04T03:00:00.000Z', 'dropped'],
  ])
  for (const action of actions) assert.equal(action.reason, 'catchup-none')
  assert.equal(scheduler.state('rollup').running, false)
  assert.equal(scheduler.state('rollup').watermark, at('2024-03-04T03:00:00.000Z'))
})

test('a run that outlives its interval keeps the backlog owed and holds the watermark', () => {
  const scheduler = make([job('rollup')], '2024-03-04T00:00:00.000Z')
  const first = scheduler.tick(at('2024-03-04T03:00:00.000Z'))

  assert.deepEqual(pairs(first.filter((action) => action.status === 'started')), [
    ['2024-03-04T01:00:00.000Z', 'started'],
  ])
  assert.deepEqual(pairs(first.filter((action) => action.status === 'deferred')), [
    ['2024-03-04T02:00:00.000Z', 'deferred'],
    ['2024-03-04T03:00:00.000Z', 'deferred'],
  ])
  assert.equal(first[first.length - 1].reason, 'job-running')
  assert.equal(scheduler.state('rollup').watermark, at('2024-03-04T01:00:00.000Z'))

  scheduler.finish('rollup', { at: at('2024-03-04T02:10:00.000Z'), ok: true })
  const second = scheduler.tick(at('2024-03-04T02:10:00.000Z'))

  assert.deepEqual(pairs(second.filter((action) => action.status === 'started')), [
    ['2024-03-04T02:00:00.000Z', 'started'],
  ])
  assert.deepEqual(second.filter((action) => action.status === 'deferred'), [])
  assert.equal(scheduler.state('rollup').watermark, at('2024-03-04T02:00:00.000Z'))

  const third = scheduler.tick(at('2024-03-04T03:00:00.000Z'))
  assert.deepEqual(pairs(third.filter((action) => action.status === 'deferred')), [
    ['2024-03-04T03:00:00.000Z', 'deferred'],
  ])
  assert.equal(third[0].reason, 'job-running')
})

test('a full pool defers a backlog instead of writing it off, and it comes back in order', () => {
  const jobs = [job('alpha', { priority: 9, seq: 1 }), job('beta', { priority: 1, seq: 2 })]
  const scheduler = make(jobs, '2024-03-04T00:00:00.000Z', { batch: 1 })

  const first = scheduler.tick(at('2024-03-04T03:00:00.000Z'))
  assert.deepEqual(first.filter((action) => action.status === 'started').map((action) => [action.jobId, action.iso]), [
    ['alpha', '2024-03-04T01:00:00.000Z'],
  ])
  assert.deepEqual(first.filter((action) => action.jobId === 'beta').map((action) => [action.iso, action.status, action.reason]), [
    ['2024-03-04T01:00:00.000Z', 'deferred', 'pool-full'],
    ['2024-03-04T02:00:00.000Z', 'deferred', 'pool-full'],
    ['2024-03-04T03:00:00.000Z', 'deferred', 'pool-full'],
  ])
  assert.equal(scheduler.state('beta').watermark, at('2024-03-04T00:00:00.000Z'))

  scheduler.finish('alpha', { at: at('2024-03-04T03:05:00.000Z'), ok: true })
  const second = scheduler.tick(at('2024-03-04T03:05:00.000Z'))

  assert.deepEqual(second.filter((action) => action.status === 'started').map((action) => [action.jobId, action.iso]), [
    ['alpha', '2024-03-04T02:00:00.000Z'],
  ])
  assert.deepEqual(pairs(second.filter((action) => action.jobId === 'beta')), [
    ['2024-03-04T01:00:00.000Z', 'deferred'],
    ['2024-03-04T02:00:00.000Z', 'deferred'],
    ['2024-03-04T03:00:00.000Z', 'deferred'],
  ])
  assert.equal(scheduler.state('beta').watermark, at('2024-03-04T00:00:00.000Z'))
  assert.equal(iso(scheduler.state('alpha').watermark), '2024-03-04T02:00:00.000Z')
})
