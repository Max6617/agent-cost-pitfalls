import test from 'node:test'
import assert from 'node:assert/strict'
import { quoteShipment } from '../src/index.js'

const book = { length: 20, width: 15, height: 10 }

test('two carriers at the same price: the quote is deterministic', () => {
  // 3.5 kg to zone 1 prices identically on two carriers (docs/pricing.md section 5)
  const q = quoteShipment({ country: 'DE', actualWeightKg: 3.5, dimsCm: book })
  assert.equal(q.carrier, 'boreas')
  assert.equal(q.baseCents, 810)
})

test('a light parcel to Germany goes to the cheapest carrier', () => {
  const q = quoteShipment({ country: 'DE', actualWeightKg: 2, dimsCm: book })
  assert.equal(q.carrier, 'pigeon')
  assert.equal(q.baseCents, 600)
})

test('a zone-4 destination is only quoted by carriers that serve it', () => {
  const q = quoteShipment({ country: 'AU', actualWeightKg: 8, dimsCm: book })
  assert.equal(q.carrier, 'atlas')
  assert.equal(q.baseCents, 2720)
})
