// Sub-problem 2: the billable weight step (docs/pricing.md section 3) - always
// up to the next half kilogram, and what that does downstream.
import test from 'node:test'
import assert from 'node:assert/strict'
import { quoteShipment, billableWeightKg } from '../src/index.js'

const book = { length: 20, width: 15, height: 10 }

test('a tenth of a kilo over still bills the full step up', () => {
  assert.equal(billableWeightKg(4.2, book), 4.5)
})

test('four point six bills as five', () => {
  assert.equal(billableWeightKg(4.6, book), 5)
})

test('a weight already on a half kilogram bills as itself', () => {
  assert.equal(billableWeightKg(6.5, book), 6.5)
})

test('a light parcel still rounds up', () => {
  assert.equal(billableWeightKg(2.1, book), 2.5)
})

test('the billed weight decides whether a carrier can take the parcel', () => {
  const q = quoteShipment({ country: 'DE', actualWeightKg: 10.2, dimsCm: book })
  assert.equal(q.billableWeightKg, 10.5)
  assert.equal(q.carrier, 'mercury')
  assert.equal(q.totalCents, 1717)
})
