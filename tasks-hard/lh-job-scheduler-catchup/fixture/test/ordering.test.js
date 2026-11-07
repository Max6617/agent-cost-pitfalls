import test from 'node:test'
import assert from 'node:assert/strict'
import { createScheduler } from '../src/index.js'

const HOUR = 3600000
const START = '2024-03-04T00:00:00.000Z'
const at = (iso) => Date.parse(iso)

const hourly = (id, overrides = {}) => ({
  id,
  pool: 'batch',
  seq: 1,
  priority: 0,
  catchup: 'all',
  schedule: { kind: 'interval', everyMs: HOUR, anchor: START },
  ...overrides,
})

test('when a pool is full the highest priority due job takes the slot', () => {
  const scheduler = createScheduler({
    jobs: [
      hourly('rate-pull', { pool: 'io', priority: 1, seq: 1 }),
      hourly('invoice-sweep', { pool: 'io', priority: 9, seq: 2 }),
    ],
    now: at(START),
  })
  const actions = scheduler.tick(at('2024-03-04T01:00:00.000Z'))

  assert.deepEqual(actions.filter((a) => a.status === 'started').map((a) => a.jobId), ['invoice-sweep'])
  assert.deepEqual(actions.filter((a) => a.status === 'deferred').map((a) => [a.jobId, a.reason]), [
    ['rate-pull', 'pool-full'],
  ])
})

test('a full pool holds up its own jobs only', () => {
  const scheduler = createScheduler({
    jobs: [
      hourly('batch-a', { pool: 'batch', seq: 1 }),
      hourly('batch-b', { pool: 'batch', seq: 2 }),
      hourly('io-a', { pool: 'io', seq: 3 }),
      hourly('io-b', { pool: 'io', seq: 4 }),
    ],
    now: at(START),
  })
  const actions = scheduler.tick(at('2024-03-04T01:00:00.000Z'))

  assert.deepEqual(actions.filter((a) => a.status === 'started').map((a) => a.jobId), ['batch-a', 'batch-b', 'io-a'])
  assert.deepEqual(actions.filter((a) => a.status === 'deferred').map((a) => [a.jobId, a.reason]), [
    ['io-b', 'pool-full'],
  ])
})
