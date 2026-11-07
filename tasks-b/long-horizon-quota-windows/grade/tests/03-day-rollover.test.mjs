// Sub-problem 3: the day boundary - the daily counter rolls over, the sliding
// window does not, and the two interact through the borrowed debt.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createQuotaService } from '../src/index.js'

const ev = (id, at, cost) => ({ id, key: 'k', at, cost })

test('the hourly window does not observe midnight', () => {
  const quota = createQuotaService({ dailyLimit: 1000, hourlyLimit: 2, borrowLimit: 0 })
  const results = quota.admitAll([ev('m-1', 86390, 1), ev('m-2', 86410, 1), ev('m-3', 86420, 1)])
  assert.deepEqual(results.map((r) => r.status), ['admitted', 'admitted', 'rejected'])
  assert.equal(results[2].reason, 'hourly-limit')
  const report = quota.usage('k')
  assert.equal(report.day, 1)
  assert.equal(report.usedToday, 1)
  assert.equal(report.windowUsed, 2)
})

test('the daily counter starts over at midnight', () => {
  const quota = createQuotaService({ dailyLimit: 5, hourlyLimit: 1000, borrowLimit: 0 })
  const results = quota.admitAll([ev('n-1', 82800, 2), ev('n-2', 86410, 3)])
  assert.deepEqual(results.map((r) => r.status), ['admitted', 'admitted'])
  assert.deepEqual(quota.usage('k'), {
    key: 'k', day: 1, usedToday: 3, remainingToday: 2, owed: 0,
    borrowed: 0, windowUsed: 3, admitted: 2, rejected: 0,
  })
})

test('a burst across midnight trips the window even when borrowing left daily room', () => {
  const quota = createQuotaService({ dailyLimit: 4, hourlyLimit: 5, borrowLimit: 2 })
  const results = quota.admitAll([
    ev('x-1', 86200, 2), ev('x-2', 86300, 2), ev('x-3', 86350, 1), ev('x-4', 86410, 1),
  ])
  assert.deepEqual(results.map((r) => r.status), ['admitted', 'admitted', 'admitted', 'rejected'])
  assert.equal(results[3].reason, 'hourly-limit')
  const report = quota.usage('k')
  assert.equal(report.day, 1)
  assert.equal(report.owed, 1)
  assert.equal(report.borrowed, 0)
  assert.equal(report.usedToday, 0)
  assert.equal(report.windowUsed, 5)
  assert.equal(report.rejected, 1)
})

test('costs from the old day still weigh after midnight', () => {
  const quota = createQuotaService({ dailyLimit: 1000, hourlyLimit: 4, borrowLimit: 0 })
  const results = quota.admitAll([ev('y-1', 86000, 3), ev('y-2', 86500, 2)])
  assert.equal(results[0].status, 'admitted')
  assert.equal(results[1].status, 'rejected')
  assert.equal(results[1].reason, 'hourly-limit')
  const report = quota.usage('k')
  assert.equal(report.day, 1)
  assert.equal(report.usedToday, 0)
  assert.equal(report.windowUsed, 3)
})

test('the report after midnight still shows the old hour', () => {
  const quota = createQuotaService({ dailyLimit: 1000, hourlyLimit: 10, borrowLimit: 0 })
  quota.admit(ev('z-1', 86390, 1))
  const before = quota.usage('k')
  quota.admit(ev('z-2', 86410, 1))
  const after = quota.usage('k')
  assert.equal(before.day, 0)
  assert.equal(before.windowUsed, 1)
  assert.equal(after.day, 1)
  assert.equal(after.usedToday, 1)
  assert.equal(after.windowUsed, 2)
  assert.equal(after.owed, 0)
  assert.equal(after.borrowed, 0)
})
