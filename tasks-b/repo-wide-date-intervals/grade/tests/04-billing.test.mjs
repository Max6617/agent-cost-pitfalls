// Sub-problem 4: billing - only the days a usage spends inside the cycle
// are billable; the cycle's closing day bills nothing.
import test from 'node:test'
import assert from 'node:assert/strict'
import { billableDays, prorate, planNights } from '../src/index.js'

test('a usage inside the cycle bills its own length', () => {
  assert.equal(billableDays({ start: 1, end: 32 }, { start: 10, end: 20 }), 10)
})

test('a usage starting on the cycle\'s closing day bills nothing', () => {
  assert.equal(billableDays({ start: 1, end: 32 }, { start: 32, end: 40 }), 0)
})

test('proration is the billable days times the daily rate', () => {
  assert.deepEqual(prorate({ start: 1, end: 32 }, { start: 5, end: 12 }, 250), { days: 7, amount: 1750 })
})

test('a promo prices the middle of a longer stay and the following usage is not double-billed', () => {
  const cycle = { start: 1, end: 32 }
  const stay = { start: 5, end: 25 }
  const plan = { start: 10, end: 20 }
  assert.equal(billableDays(cycle, stay), 20)
  assert.equal(planNights(plan, stay), 10)
  assert.equal(billableDays(cycle, { start: 25, end: 30 }), 5)
})
