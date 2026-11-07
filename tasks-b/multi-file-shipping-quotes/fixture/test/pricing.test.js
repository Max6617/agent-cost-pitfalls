import test from 'node:test'
import assert from 'node:assert/strict'
import { quoteShipment } from '../src/index.js'

const book = { length: 20, width: 15, height: 10 }
const tube = { length: 110, width: 10, height: 10 }

test('a 10% loyalty discount on a fragile 4 kg parcel to Germany', () => {
  const q = quoteShipment({ country: 'DE', actualWeightKg: 4, dimsCm: book, fragile: true, discountPct: 10 })
  assert.equal(q.discountCents, 87)
  assert.equal(q.totalCents, 853)
})

test('an oversize parcel carries the flat fee on top of the discounted freight', () => {
  const q = quoteShipment({ country: 'DE', actualWeightKg: 4, dimsCm: tube, discountPct: 10 })
  assert.equal(q.surcharges.oversizeCents, 1500)
  assert.equal(q.totalCents, 2367)
})

test('a 30% discount on a 30 kg parcel to Japan', () => {
  const q = quoteShipment({ country: 'JP', actualWeightKg: 30, dimsCm: book, discountPct: 30 })
  assert.equal(q.freeShipping, false)
  assert.equal(q.totalCents, 5600)
})

test('a plain 4 kg parcel to Germany with no extras', () => {
  const q = quoteShipment({ country: 'DE', actualWeightKg: 4, dimsCm: book })
  assert.equal(q.carrier, 'boreas')
  assert.equal(q.totalCents, 870)
})
