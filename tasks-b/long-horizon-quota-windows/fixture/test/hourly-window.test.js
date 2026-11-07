import test from 'node:test'
import assert from 'node:assert/strict'
import { createQuotaService } from '../src/index.js'

const ev = (id, at, cost) => ({ id, key: 'k', at, cost })

test('a burst straddling the clock-hour seam still trips the hourly limit', () => {
  const quota = createQuotaService({ dailyLimit: 1000, hourlyLimit: 2, borrowLimit: 0 })
  const results = quota.admitAll([ev('w-1', 7000, 1), ev('w-2', 7050, 1), ev('w-3', 7210, 1)])
  assert.deepEqual(results.map((r) => r.status), ['admitted', 'admitted', 'rejected'])
  assert.equal(results[2].reason, 'hourly-limit')
})

test('costs, not request counts, are what the window measures', () => {
  const quota = createQuotaService({ dailyLimit: 1000, hourlyLimit: 4, borrowLimit: 0 })
  const results = quota.admitAll([ev('c-1', 7100, 3), ev('c-2', 7300, 2)])
  assert.equal(results[0].status, 'admitted')
  assert.equal(results[1].status, 'rejected')
  assert.equal(results[1].reason, 'hourly-limit')
})
