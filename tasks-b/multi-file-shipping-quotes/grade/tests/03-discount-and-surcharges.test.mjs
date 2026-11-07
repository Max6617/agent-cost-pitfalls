// Sub-problem 3: discounts and surcharges (docs/pricing.md sections 6-7) - the
// discount comes off the base freight only, surcharges are added in full.
import test from 'node:test'
import assert from 'node:assert/strict'
import { quoteShipment } from '../src/index.js'

const book = { length: 20, width: 15, height: 10 }
const tube = { length: 110, width: 10, height: 10 }

test('the discount is taken on the freight only', () => {
  const q = quoteShipment({ country: 'DE', actualWeightKg: 4, dimsCm: book, fragile: true, discountPct: 10 })
  assert.equal(q.discountCents, 87)
  assert.equal(q.totalCents, 853)
})

test('the fragile line is worked out on the freight and rounded to the cent', () => {
  const q = quoteShipment({ country: 'PL', actualWeightKg: 3, dimsCm: book, fragile: true, discountPct: 10 })
  assert.equal(q.surcharges.fragileCents, 70)
  assert.equal(q.totalCents, 860)
})

test('the oversize fee is a flat amount added after the discount', () => {
  const q = quoteShipment({ country: 'DE', actualWeightKg: 4, dimsCm: tube, discountPct: 10 })
  assert.equal(q.surcharges.oversizeCents, 1500)
  assert.equal(q.totalCents, 2367)
})

test('fragile and oversize stack on the discounted freight', () => {
  const q = quoteShipment({ country: 'DE', actualWeightKg: 4, dimsCm: tube, fragile: true, discountPct: 10 })
  assert.equal(q.discountCents, 96)
  assert.equal(q.surcharges.fragileCents, 77)
  assert.equal(q.totalCents, 2444)
})

test('the discount itself is rounded half-up to the cent', () => {
  const q = quoteShipment({ country: 'DE', actualWeightKg: 4, dimsCm: book, fragile: true, discountPct: 25 })
  assert.equal(q.discountCents, 218)
  assert.equal(q.totalCents, 722)
})
