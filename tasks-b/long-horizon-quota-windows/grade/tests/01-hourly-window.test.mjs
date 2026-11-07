// Sub-problem 1: the hourly window is a sliding hour, not the clock hour -
// including its exact edges, what weighs against it, and what a rejection costs.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createQuotaService } from '../src/index.js'

const ev = (id, at, cost) => ({ id, key: 'k', at, cost })

test('a burst straddling the hour seam still trips the window', () => {
  const quota = createQuotaService({ dailyLimit: 1000, hourlyLimit: 3, borrowLimit: 0 })
  const results = quota.admitAll([
    ev('s-1', 3500, 1), ev('s-2', 3550, 1), ev('s-3', 3610, 1), ev('s-4', 3660, 1),
  ])
  assert.deepEqual(results.map((r) => r.status), ['admitted', 'admitted', 'admitted', 'rejected'])
  assert.equal(results[3].reason, 'hourly-limit')
  assert.equal(quota.usage('k').windowUsed, 3)
  assert.equal(quota.usage('k').rejected, 1)
})

test('an event exactly one hour old has aged out of the window', () => {
  const quota = createQuotaService({ dailyLimit: 1000, hourlyLimit: 3, borrowLimit: 0 })
  const results = quota.admitAll([
    ev('h-1', 1000, 1), ev('h-2', 2000, 1), ev('h-3', 4600, 1), ev('h-4', 4700, 1), ev('h-5', 4800, 1),
  ])
  assert.deepEqual(results.map((r) => r.status), [
    'admitted', 'admitted', 'admitted', 'admitted', 'rejected',
  ])
  assert.equal(results[4].reason, 'hourly-limit')
  assert.equal(quota.usage('k').windowUsed, 3)
})

test('costs weigh against the window, not just requests', () => {
  const quota = createQuotaService({ dailyLimit: 1000, hourlyLimit: 5, borrowLimit: 0 })
  const results = quota.admitAll([ev('w-1', 3500, 3), ev('w-2', 3700, 3)])
  assert.equal(results[0].status, 'admitted')
  assert.equal(results[1].status, 'rejected')
  assert.equal(results[1].reason, 'hourly-limit')
  assert.equal(quota.usage('k').windowUsed, 3)
})

test('a burst inside one clock hour is throttled at the limit', () => {
  const quota = createQuotaService({ dailyLimit: 1000, hourlyLimit: 3, borrowLimit: 0 })
  const results = quota.admitAll([
    ev('g-1', 100, 1), ev('g-2', 200, 1), ev('g-3', 300, 1), ev('g-4', 400, 1),
  ])
  assert.deepEqual(results.map((r) => r.status), ['admitted', 'admitted', 'admitted', 'rejected'])
  assert.deepEqual(quota.usage('k'), {
    key: 'k', day: 0, usedToday: 3, remainingToday: 997, owed: 0,
    borrowed: 0, windowUsed: 3, admitted: 3, rejected: 1,
  })
})

test('a rejected request consumes nothing and the window slides on', () => {
  const quota = createQuotaService({ dailyLimit: 1000, hourlyLimit: 3, borrowLimit: 0 })
  const results = quota.admitAll([
    ev('r-1', 3500, 1), ev('r-2', 3550, 1), ev('r-3', 3590, 1), ev('r-4', 3620, 1), ev('r-5', 7200, 1),
  ])
  assert.deepEqual(results.map((r) => r.status), [
    'admitted', 'admitted', 'admitted', 'rejected', 'admitted',
  ])
  const report = quota.usage('k')
  assert.equal(report.admitted, 4)
  assert.equal(report.rejected, 1)
  assert.equal(report.windowUsed, 1)
})
