// Sub-problem 1: dimensional weight (docs/pricing.md section 2) and the way it
// feeds billable weight and carrier selection.
import test from 'node:test'
import assert from 'node:assert/strict'
import { quoteShipment, billableWeightKg, dimensionalWeightKg } from '../src/index.js'

test('a parcel much bigger than it is heavy bills on its size', () => {
  // 40x30x20 cm = 24000 cm3; section 2 pins the worked example at 4.8 kg
  assert.equal(billableWeightKg(1, { length: 40, width: 30, height: 20 }), 5)
})

test('dimensional weight grows with volume', () => {
  const smaller = dimensionalWeightKg({ length: 40, width: 30, height: 20 })
  const larger = dimensionalWeightKg({ length: 50, width: 40, height: 30 })
  assert.equal(smaller, 4.8)
  assert.equal(larger, 12)
  assert.ok(smaller < larger)
})

test('the greater of actual and dimensional weight is the one that bills', () => {
  assert.equal(billableWeightKg(4, { length: 40, width: 30, height: 20 }), 5)
})

test('a light but bulky zone-3 parcel is quoted at its true weight', () => {
  const q = quoteShipment({ country: 'SE', actualWeightKg: 6, dimsCm: { length: 60, width: 50, height: 40 } })
  assert.equal(q.billableWeightKg, 24)
  assert.equal(q.carrier, 'atlas')
  assert.equal(q.baseCents, 4834)
})

test('a bulky parcel can land on a price tie between carriers', () => {
  const q = quoteShipment({ country: 'SE', actualWeightKg: 3, dimsCm: { length: 50, width: 50, height: 30 } })
  assert.equal(q.billableWeightKg, 15)
  assert.equal(q.carrier, 'atlas')
  assert.equal(q.baseCents, 3250)
})
