// Sub-problem 2: borrowing against tomorrow - the cap, the all-or-nothing
// rule, and the debt being collected from exactly the next day's allowance.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createQuotaService } from '../src/index.js'

const ev = (id, at, cost) => ({ id, key: 'k', at, cost })
const mk = () => createQuotaService({ dailyLimit: 5, hourlyLimit: 1000, borrowLimit: 3 })

test('a key may burst past the daily limit by borrowing against tomorrow', () => {
  const quota = mk()
  const results = quota.admitAll([ev('b-1', 7200, 5), ev('b-2', 14400, 2)])
  assert.deepEqual(results.map((r) => r.status), ['admitted', 'admitted'])
  assert.deepEqual(quota.usage('k'), {
    key: 'k', day: 0, usedToday: 7, remainingToday: 0, owed: 0,
    borrowed: 2, windowUsed: 2, admitted: 2, rejected: 0,
  })
})

test('borrowed units come out of the next day\'s allowance', () => {
  const quota = mk()
  const results = quota.admitAll([
    ev('d-1', 7200, 5), ev('d-2', 14400, 2), ev('d-3', 90000, 3), ev('d-4', 97200, 3), ev('d-5', 104400, 1),
  ])
  assert.deepEqual(results.map((r) => r.status), [
    'admitted', 'admitted', 'admitted', 'admitted', 'rejected',
  ])
  assert.equal(results[4].reason, 'daily-limit')
  const report = quota.usage('k')
  assert.equal(report.day, 1)
  assert.equal(report.owed, 2)
  assert.equal(report.borrowed, 3)
  assert.equal(report.usedToday, 6)
  assert.equal(report.remainingToday, 0)
})

test('the borrow cap is a hard ceiling, and it can be reached exactly', () => {
  const quota = mk()
  const results = quota.admitAll([ev('c-1', 7200, 5), ev('c-2', 14400, 3), ev('c-3', 21600, 1)])
  assert.deepEqual(results.map((r) => r.status), ['admitted', 'admitted', 'rejected'])
  assert.equal(results[2].reason, 'daily-limit')
  const report = quota.usage('k')
  assert.equal(report.borrowed, 3)
  assert.equal(report.remainingToday, 0)
  assert.equal(report.rejected, 1)
})

test('the debt rides exactly one day and then it is gone', () => {
  const quota = mk()
  quota.admitAll([ev('g-1', 7200, 5), ev('g-2', 14400, 2), ev('g-3', 90000, 1)])
  const onDayOne = quota.usage('k')
  const last = quota.admit(ev('g-4', 180000, 5))
  const onDayTwo = quota.usage('k')
  assert.equal(last.status, 'admitted')
  assert.equal(onDayOne.day, 1)
  assert.equal(onDayOne.owed, 2)
  assert.equal(onDayOne.usedToday, 1)
  assert.equal(onDayOne.remainingToday, 2)
  assert.equal(onDayTwo.day, 2)
  assert.equal(onDayTwo.owed, 0)
  assert.equal(onDayTwo.borrowed, 0)
  assert.equal(onDayTwo.usedToday, 5)
  assert.equal(onDayTwo.remainingToday, 0)
})

test('a request refused at the cap borrows nothing, and the debt still lands tomorrow', () => {
  const quota = mk()
  const results = quota.admitAll([ev('f-1', 7200, 5), ev('f-2', 14400, 3), ev('f-3', 21600, 2)])
  assert.equal(results[2].status, 'rejected')
  assert.equal(quota.usage('k').borrowed, 3)
  const nextDay = quota.admit(ev('f-4', 90000, 2))
  assert.equal(nextDay.status, 'admitted')
  const report = quota.usage('k')
  assert.equal(report.day, 1)
  assert.equal(report.owed, 3)
  assert.equal(report.usedToday, 2)
  assert.equal(report.remainingToday, 0)
  assert.equal(report.borrowed, 0)
})
