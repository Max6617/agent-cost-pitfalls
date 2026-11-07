import test from 'node:test'
import assert from 'node:assert/strict'
import { createQuotaService } from '../src/index.js'

const ev = (id, at, cost) => ({ id, key: 'k', at, cost })

test('a late arrival lands in its canonical slot, once', () => {
  const quota = createQuotaService({ dailyLimit: 10, hourlyLimit: 1000, borrowLimit: 0 })
  quota.admitAll([ev('o-1', 7200, 2), ev('o-2', 14400, 2)])
  quota.admit(ev('o-0', 3600, 1))
  const report = quota.usage('k')
  assert.equal(report.usedToday, 5)
  assert.equal(report.admitted, 3)
  assert.deepEqual(quota.log('k').map((e) => e.id), ['o-0', 'o-1', 'o-2'])
})

test('two requests at the same second are ordered by id', () => {
  const quota = createQuotaService({ dailyLimit: 1, hourlyLimit: 1000, borrowLimit: 0 })
  quota.admit({ id: 'b-2', key: 'k', at: 5000, cost: 1 })
  quota.admit({ id: 'a-1', key: 'k', at: 5000, cost: 1 })
  assert.equal(quota.statusOf('a-1'), 'admitted')
  assert.equal(quota.statusOf('b-2'), 'rejected')
})
