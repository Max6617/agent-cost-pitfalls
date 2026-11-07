import test from 'node:test'
import assert from 'node:assert/strict'
import { createQuotaService } from '../src/index.js'

const ev = (id, at, cost) => ({ id, key: 'k', at, cost })

test('a key may burst past the daily limit by borrowing against tomorrow', () => {
  const quota = createQuotaService({ dailyLimit: 5, hourlyLimit: 1000, borrowLimit: 3 })
  const results = quota.admitAll([ev('b-1', 7200, 5), ev('b-2', 14400, 2)])
  assert.deepEqual(results.map((r) => r.status), ['admitted', 'admitted'])
  assert.equal(quota.usage('k').borrowed, 2)
  assert.equal(quota.usage('k').remainingToday, 0)
})

test('borrowed units come out of the next day\'s allowance', () => {
  const quota = createQuotaService({ dailyLimit: 5, hourlyLimit: 1000, borrowLimit: 3 })
  quota.admitAll([ev('b-1', 7200, 5), ev('b-2', 14400, 2), ev('b-3', 90000, 1)])
  const report = quota.usage('k')
  assert.equal(report.day, 1)
  assert.equal(report.owed, 2)
  assert.equal(report.remainingToday, 2)
})
