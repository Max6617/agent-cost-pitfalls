import test from 'node:test'
import assert from 'node:assert/strict'
import { billableWeightKg, dimensionalWeightKg } from '../src/index.js'

const book = { length: 20, width: 15, height: 10 }

test('a large but light parcel bills on its size, not its mass', () => {
  // 40x30x20 cm is 24000 cm3, so 4.8 kg dimensional (docs/pricing.md section 2)
  assert.equal(billableWeightKg(1, { length: 40, width: 30, height: 20 }), 5)
})

test('dimensional weight grows with the volume', () => {
  assert.equal(dimensionalWeightKg({ length: 50, width: 40, height: 30 }), 12)
})

test('the billable weight moves up to the next half kilogram', () => {
  assert.equal(billableWeightKg(4.2, book), 4.5)
})
