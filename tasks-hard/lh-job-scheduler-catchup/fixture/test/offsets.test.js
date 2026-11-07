import test from 'node:test'
import assert from 'node:assert/strict'
import { createScheduler, loadOffsets, offsets } from '../src/index.js'

const at = (iso) => Date.parse(iso)
const table = loadOffsets()

test('a job scheduled at 05:30 local runs at the published absolute instant', () => {
  assert.equal(
    offsets.localToEpoch(table, 'Europe/Berlin', '2024-03-30T05:30:00.000'),
    at('2024-03-30T04:30:00.000Z'),
  )
})

test('the same local time moves by the offset change and is never lost or doubled', () => {
  assert.equal(
    offsets.localToEpoch(table, 'Europe/Berlin', '2024-03-31T05:30:00.000'),
    at('2024-03-31T03:30:00.000Z'),
  )
  assert.equal(
    offsets.localToEpoch(table, 'Europe/Berlin', '2024-04-01T05:30:00.000'),
    at('2024-04-01T03:30:00.000Z'),
  )

  const scheduler = createScheduler({
    now: at('2024-03-31T00:00:00.000Z'),
    jobs: [{
      id: 'nightly-rollup',
      pool: 'batch',
      catchup: 'all',
      schedule: { kind: 'local-daily', zone: 'Europe/Berlin', at: '05:30' },
    }],
  })
  const actions = scheduler.tick(at('2024-03-31T12:00:00.000Z'))

  assert.deepEqual(
    actions.filter((a) => a.status === 'started').map((a) => a.iso),
    ['2024-03-31T03:30:00.000Z'],
  )
})
