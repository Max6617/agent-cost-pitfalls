// Sub-problem 4: free shipping (docs/pricing.md section 8) - the threshold is
// compared on the discounted freight, before surcharges.
import test from 'node:test'
import assert from 'node:assert/strict'
import { quoteShipment } from '../src/index.js'

const book = { length: 20, width: 15, height: 10 }

test('freight that discounts below the threshold does not ship free', () => {
  const q = quoteShipment({ country: 'JP', actualWeightKg: 30, dimsCm: book, discountPct: 30 })
  assert.equal(q.freeShipping, false)
  assert.equal(q.totalCents, 5600)
})

test('freight that discounts to exactly the threshold ships free', () => {
  const q = quoteShipment({ country: 'JP', actualWeightKg: 30, dimsCm: book, discountPct: 25, fragile: true })
  assert.equal(q.freeShipping, true)
  // the fragile surcharge is still payable in full on a free-shipping quote
  assert.equal(q.totalCents, 640)
})

test('a fragile parcel just under the threshold pays freight and surcharge', () => {
  const q = quoteShipment({ country: 'JP', actualWeightKg: 30, dimsCm: book, discountPct: 30, fragile: true })
  assert.equal(q.freeShipping, false)
  assert.equal(q.totalCents, 6240)
})

test('surcharges never count toward the free-shipping threshold', () => {
  const q = quoteShipment({ country: 'JP', actualWeightKg: 30, dimsCm: { length: 110, width: 30, height: 20 }, discountPct: 30 })
  assert.equal(q.freeShipping, false)
  assert.equal(q.totalCents, 7100)
})
