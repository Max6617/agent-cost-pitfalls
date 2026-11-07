import test from 'node:test'
import assert from 'node:assert/strict'
import { proratedCents, daysRemaining } from '../src/index.js'

test('a mid-period proration comes out in whole cents', () => {
  // 29.99 for half of a 30-day period: support quotes 15.00
  assert.equal(proratedCents(2999, 15, 30), 1500)
})

test('the day of the change counts toward what is billed', () => {
  assert.equal(daysRemaining('2026-03-16', '2026-03-31'), 16)
  assert.equal(daysRemaining('2026-03-31', '2026-03-31'), 1)
})
