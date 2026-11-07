// Sub-problem 2: the day-count convention (docs/billing-rules.md §2) - the
// effective day and the last day of the period both count.
import test from 'node:test'
import assert from 'node:assert/strict'
import { daysInPeriod, daysRemaining } from '../src/index.js'

test('remaining days include the day the change takes effect', () => {
  assert.equal(daysRemaining('2026-03-16', '2026-03-31'), 16)
  assert.equal(daysRemaining('2026-04-21', '2026-04-30'), 10)
})

test('a change on the last day of the period still has one day to bill', () => {
  assert.equal(daysRemaining('2026-04-30', '2026-04-30'), 1)
})

test('a change on the first day of the period has the whole period to bill', () => {
  assert.equal(daysRemaining('2026-03-01', '2026-03-31'), 31)
  assert.equal(daysRemaining('2026-04-01', '2026-04-30'), 30)
})

test('a period is counted inclusively at both ends, leap years included', () => {
  assert.equal(daysInPeriod('2026-03-01', '2026-03-31'), 31)
  assert.equal(daysInPeriod('2026-02-01', '2026-02-28'), 28)
  assert.equal(daysInPeriod('2028-02-01', '2028-02-29'), 29)
})
