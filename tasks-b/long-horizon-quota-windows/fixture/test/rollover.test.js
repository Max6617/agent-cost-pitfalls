import test from 'node:test'
import assert from 'node:assert/strict'
import { createQuotaService } from '../src/index.js'

const ev = (id, at, cost) => ({ id, key: 'k', at, cost })

test('the hourly window does not observe midnight', () => {
  const quota = createQuotaService({ dailyLimit: 1000, hourlyLimit: 2, borrowLimit: 0 })
  const results = quota.admitAll([ev('m-1', 86390, 1), ev('m-2', 86410, 1), ev('m-3', 86420, 1)])
  assert.deepEqual(results.map((r) => r.status), ['admitted', 'admitted', 'rejected'])
  assert.equal(results[2].reason, 'hourly-limit')
})

test('the report after midnight still shows the old hour', () => {
  const quota = createQuotaService({ dailyLimit: 1000, hourlyLimit: 10, borrowLimit: 0 })
  quota.admitAll([ev('m-1', 86390, 1), ev('m-2', 86410, 1)])
  const report = quota.usage('k')
  assert.equal(report.day, 1)
  assert.equal(report.usedToday, 1)
  assert.equal(report.windowUsed, 2)
})
