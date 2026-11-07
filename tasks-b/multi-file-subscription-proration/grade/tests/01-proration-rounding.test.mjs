// Sub-problem 1: prorated amounts are exact cents, rounded half-up on the
// exact value (docs/billing-rules.md §2) - never rounded through a float.
import test from 'node:test'
import assert from 'node:assert/strict'
import { proratedCents } from '../src/index.js'

test('half a period of a .99 price rounds half-up, not to the float below', () => {
  assert.equal(proratedCents(2999, 15, 30), 1500)
  assert.equal(proratedCents(1999, 15, 30), 1000)
})

test('awkward fractions of the period round on the exact value too', () => {
  assert.equal(proratedCents(2499, 10, 28), 893)
  assert.equal(proratedCents(2499, 5, 30), 417)
  assert.equal(proratedCents(1099, 6, 28), 236)
})

test('even splits, full periods and empty remainders come out whole', () => {
  assert.equal(proratedCents(1200, 10, 20), 600)
  assert.equal(proratedCents(2999, 30, 30), 2999)
  assert.equal(proratedCents(4500, 0, 30), 0)
})
