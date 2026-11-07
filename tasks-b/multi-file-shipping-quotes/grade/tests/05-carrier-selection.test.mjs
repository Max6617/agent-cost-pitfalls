// Sub-problem 5: eligibility and carrier selection (docs/pricing.md section 5)
// - zone coverage, the maximum weight, and ties by lowest carrier code.
import test from 'node:test'
import assert from 'node:assert/strict'
import { quoteShipment } from '../src/index.js'

const book = { length: 20, width: 15, height: 10 }

test('equal prices go to the lowest carrier code', () => {
  const q = quoteShipment({ country: 'DE', actualWeightKg: 3.5, dimsCm: book })
  assert.equal(q.carrier, 'boreas')
  assert.equal(q.baseCents, 810)
})

test('a zone-3 tie also goes to the lowest code', () => {
  const q = quoteShipment({ country: 'SE', actualWeightKg: 15, dimsCm: book })
  assert.equal(q.carrier, 'atlas')
  assert.equal(q.baseCents, 3250)
})

test('a carrier takes a parcel at exactly its maximum weight', () => {
  const q = quoteShipment({ country: 'DE', actualWeightKg: 10, dimsCm: book })
  assert.equal(q.carrier, 'boreas')
  assert.equal(q.baseCents, 1590)
})

test('only carriers serving the destination are quoted', () => {
  const q = quoteShipment({ country: 'AU', actualWeightKg: 8, dimsCm: book })
  assert.equal(q.carrier, 'atlas')
  assert.equal(q.baseCents, 2720)
})

test('an oversize tie is still settled by carrier code', () => {
  const q = quoteShipment({ country: 'SE', actualWeightKg: 15, dimsCm: { length: 110, width: 20, height: 15 } })
  assert.equal(q.oversize, true)
  assert.equal(q.carrier, 'atlas')
  assert.equal(q.baseCents, 3250)
})
