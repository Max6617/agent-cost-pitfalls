import test from 'node:test'
import assert from 'node:assert/strict'
import { createQuotaService } from '../src/index.js'

const ev = (id, at, cost) => ({ id, key: 'k', at, cost })

test('the report is right after every prefix of the stream', () => {
  const quota = createQuotaService({ dailyLimit: 1000, hourlyLimit: 3, borrowLimit: 0 })
  quota.admit(ev('p-1', 3500, 1))
  assert.equal(quota.usage('k').windowUsed, 1)
  quota.admitAll([ev('p-2', 3610, 1), ev('p-3', 3660, 1)])
  assert.equal(quota.usage('k').windowUsed, 3)
  const last = quota.admit(ev('p-4', 3700, 1))
  assert.equal(last.status, 'rejected')
  const report = quota.usage('k')
  assert.equal(report.admitted, 3)
  assert.equal(report.rejected, 1)
  assert.equal(report.windowUsed, 3)
})

test('a key the service has never seen reports zeros', () => {
  const quota = createQuotaService({ dailyLimit: 7, hourlyLimit: 3, borrowLimit: 1 })
  assert.deepEqual(quota.usage('nobody'), {
    key: 'nobody',
    day: null,
    usedToday: 0,
    remainingToday: 7,
    owed: 0,
    borrowed: 0,
    windowUsed: 0,
    admitted: 0,
    rejected: 0,
  })
})
