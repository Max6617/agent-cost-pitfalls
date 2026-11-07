// Sub-problem 4: events arrive out of timestamp order - the outcome is the
// canonical replay, each event counted once, statuses revised as of now.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createQuotaService } from '../src/index.js'

const ev = (id, at, cost) => ({ id, key: 'k', at, cost })

test('a late arrival lands in its canonical slot, once', () => {
  const quota = createQuotaService({ dailyLimit: 10, hourlyLimit: 1000, borrowLimit: 0 })
  quota.admitAll([ev('o-1', 7200, 2), ev('o-2', 14400, 2), ev('o-3', 21600, 1)])
  const late = quota.admit(ev('o-0', 3600, 1))
  assert.equal(late.status, 'admitted')
  for (const id of ['o-0', 'o-1', 'o-2', 'o-3']) assert.equal(quota.statusOf(id), 'admitted')
  const report = quota.usage('k')
  assert.equal(report.usedToday, 6)
  assert.equal(report.admitted, 4)
  assert.equal(report.rejected, 0)
  assert.deepEqual(quota.log('k').map((e) => e.id), ['o-0', 'o-1', 'o-2', 'o-3'])
})

test('a late arrival can push a later request over the daily allowance', () => {
  const quota = createQuotaService({ dailyLimit: 3, hourlyLimit: 1000, borrowLimit: 0 })
  quota.admitAll([ev('q-1', 7200, 1), ev('q-2', 14400, 1), ev('q-3', 21600, 1)])
  const late = quota.admit(ev('q-0', 3600, 1))
  assert.equal(late.status, 'admitted')
  assert.equal(quota.statusOf('q-0'), 'admitted')
  assert.equal(quota.statusOf('q-1'), 'admitted')
  assert.equal(quota.statusOf('q-2'), 'admitted')
  assert.equal(quota.statusOf('q-3'), 'rejected')
  const report = quota.usage('k')
  assert.equal(report.usedToday, 3)
  assert.equal(report.admitted, 3)
  assert.equal(report.rejected, 1)
})

test('a late burst revises what the next day owes', () => {
  const quota = createQuotaService({ dailyLimit: 5, hourlyLimit: 1000, borrowLimit: 3 })
  quota.admitAll([ev('v-1', 7200, 5), ev('v-2', 90000, 2)])
  const late = quota.admit(ev('v-0', 14400, 2))
  assert.equal(late.status, 'admitted')
  assert.equal(quota.statusOf('v-0'), 'admitted')
  assert.equal(quota.statusOf('v-2'), 'admitted')
  const report = quota.usage('k')
  assert.equal(report.day, 1)
  assert.equal(report.owed, 2)
  assert.equal(report.usedToday, 2)
  assert.equal(report.remainingToday, 1)
  assert.equal(report.admitted, 3)
})

test('a late arrival inside the hour re-decides the window', () => {
  const quota = createQuotaService({ dailyLimit: 1000, hourlyLimit: 2, borrowLimit: 0 })
  quota.admitAll([ev('u-1', 1000, 1), ev('u-2', 3000, 1)])
  const late = quota.admit(ev('u-0', 2000, 1))
  assert.equal(late.status, 'admitted')
  assert.equal(quota.statusOf('u-0'), 'admitted')
  assert.equal(quota.statusOf('u-1'), 'admitted')
  assert.equal(quota.statusOf('u-2'), 'rejected')
  const report = quota.usage('k')
  assert.equal(report.windowUsed, 2)
  assert.equal(report.admitted, 2)
  assert.equal(report.rejected, 1)
})

test('two requests at the same second are ordered by id', () => {
  const quota = createQuotaService({ dailyLimit: 1, hourlyLimit: 1000, borrowLimit: 0 })
  quota.admit({ id: 'b-2', key: 'k', at: 5000, cost: 1 })
  quota.admit({ id: 'a-1', key: 'k', at: 5000, cost: 1 })
  assert.equal(quota.statusOf('a-1'), 'admitted')
  assert.equal(quota.statusOf('b-2'), 'rejected')
  assert.equal(quota.usage('k').admitted, 1)
  assert.deepEqual(quota.log('k').map((e) => e.id), ['a-1', 'b-2'])
})
