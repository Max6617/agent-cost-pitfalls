// Sub-problem 5: the usage report is a correct snapshot after any prefix of
// the stream - across slides, debts, late arrivals and independent keys.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createQuotaService } from '../src/index.js'

const ev = (id, key, at, cost) => ({ id, key, at, cost })

test('the report is right after every prefix of the stream', () => {
  const quota = createQuotaService({ dailyLimit: 1000, hourlyLimit: 3, borrowLimit: 0 })
  quota.admit(ev('p-1', 'k', 3500, 1))
  const first = quota.usage('k')
  quota.admit(ev('p-2', 'k', 3550, 1))
  quota.admit(ev('p-3', 'k', 3610, 1))
  const third = quota.usage('k')
  const refused = quota.admit(ev('p-4', 'k', 3660, 1))
  const fourth = quota.usage('k')
  assert.equal(refused.status, 'rejected')
  assert.equal(first.windowUsed, 1)
  assert.equal(third.windowUsed, 3)
  assert.equal(third.usedToday, 3)
  assert.equal(fourth.windowUsed, 3)
  assert.equal(fourth.usedToday, 3)
  assert.equal(fourth.remainingToday, 997)
  assert.equal(fourth.admitted, 3)
  assert.equal(fourth.rejected, 1)
  // a report is a snapshot: later events must not reach back into it
  assert.equal(first.windowUsed, 1)
})

test('the report carries the debt across the day boundary', () => {
  const quota = createQuotaService({ dailyLimit: 5, hourlyLimit: 1000, borrowLimit: 3 })
  quota.admitAll([ev('d-1', 'k', 7200, 5), ev('d-2', 'k', 14400, 2)])
  assert.deepEqual(quota.usage('k'), {
    key: 'k', day: 0, usedToday: 7, remainingToday: 0, owed: 0,
    borrowed: 2, windowUsed: 2, admitted: 2, rejected: 0,
  })
  quota.admit(ev('d-3', 'k', 90000, 1))
  const report = quota.usage('k')
  assert.equal(report.day, 1)
  assert.equal(report.owed, 2)
  assert.equal(report.usedToday, 1)
  assert.equal(report.remainingToday, 2)
  assert.equal(report.borrowed, 0)
  assert.equal(report.admitted, 3)
})

test('the report reflects the canonical replay, not the arrival order', () => {
  const quota = createQuotaService({ dailyLimit: 10, hourlyLimit: 1000, borrowLimit: 0 })
  quota.admitAll([ev('t-1', 'k', 7200, 1), ev('t-2', 'k', 14400, 1)])
  quota.admit(ev('t-0', 'k', 3600, 1))
  const report = quota.usage('k')
  assert.equal(report.day, 0)
  assert.equal(report.usedToday, 3)
  assert.equal(report.admitted, 3)
  assert.equal(report.rejected, 0)
})

test('keys are independent, and an unknown key reports zeros', () => {
  const quota = createQuotaService({ dailyLimit: 1000, hourlyLimit: 2, borrowLimit: 0 })
  quota.admitAll([
    ev('a-1', 'A', 3500, 1), ev('a-2', 'A', 3610, 1), ev('a-3', 'A', 3660, 1),
    ev('b-1', 'B', 3500, 1), ev('b-2', 'B', 3660, 1),
  ])
  assert.equal(quota.statusOf('a-3'), 'rejected')
  assert.equal(quota.statusOf('b-2'), 'admitted')
  const reportA = quota.usage('A')
  assert.equal(reportA.admitted, 2)
  assert.equal(reportA.rejected, 1)
  assert.equal(reportA.windowUsed, 2)
  const reportB = quota.usage('B')
  assert.equal(reportB.admitted, 2)
  assert.equal(reportB.rejected, 0)
  assert.equal(reportB.windowUsed, 2)
  assert.deepEqual(quota.usage('C'), {
    key: 'C', day: null, usedToday: 0, remainingToday: 1000, owed: 0,
    borrowed: 0, windowUsed: 0, admitted: 0, rejected: 0,
  })
})
