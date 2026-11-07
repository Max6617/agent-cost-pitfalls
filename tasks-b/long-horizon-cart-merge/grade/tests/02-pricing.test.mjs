// Sub-problem 2: the merge is a repricing event for the whole cart - every line,
// from either cart, wrapped or not, is re-resolved against the catalog at merge
// time. A display snapshot never survives it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createCartService } from '../src/index.js'

function svc() {
  return createCartService({
    catalog: [
      { sku: 'MUG', title: 'Enamel mug', priceCents: 1200 },
      { sku: 'TEA', title: 'Green tea', priceCents: 800 },
      { sku: 'SCARF', title: 'Wool scarf', priceCents: 4500 },
    ],
    stock: { MUG: 20, TEA: 20, SCARF: 20 },
    maxPerCustomer: 6,
  })
}

test('a guest line is priced from the catalog at merge time, not from its snapshot', () => {
  const s = svc()
  s.guestAdd('g-1', { sku: 'MUG', qty: 2, addedAt: '2026-01-10' })
  s.setPrice('MUG', 1500)
  s.login('alice', 'g-1', '2026-01-15')
  const line = s.view('alice').lines.find((l) => l.sku === 'MUG')
  assert.equal(line.unitPriceCents, 1500)
  assert.equal(line.lineTotalCents, 3000)
})

test('lines already in the account cart are re-resolved at merge as well', () => {
  const s = svc()
  s.accountAdd('alice', { sku: 'TEA', qty: 1, addedAt: '2026-01-08' })
  s.guestAdd('g-1', { sku: 'MUG', qty: 1, addedAt: '2026-01-10' })
  s.setPrice('TEA', 700)
  s.login('alice', 'g-1', '2026-01-15')
  const view = s.view('alice')
  assert.equal(view.lines.find((l) => l.sku === 'TEA').unitPriceCents, 700)
  assert.equal(view.lines.find((l) => l.sku === 'MUG').unitPriceCents, 1200)
})

test('a gift-wrapped parcel reprices like any other line', () => {
  const s = svc()
  s.guestAdd('g-1', { sku: 'SCARF', qty: 1, giftWrap: true, addedAt: '2026-01-10' })
  s.setPrice('SCARF', 3900)
  s.login('alice', 'g-1', '2026-01-15')
  const parcel = s.view('alice').lines.find((l) => l.giftWrap)
  assert.equal(parcel.unitPriceCents, 3900)
  assert.equal(parcel.lineTotalCents, 3900)
})

test('the merged totals are computed from the re-resolved prices', () => {
  const s = svc()
  s.guestAdd('g-1', { sku: 'MUG', qty: 2, addedAt: '2026-01-10' })
  s.accountAdd('alice', { sku: 'TEA', qty: 1, addedAt: '2026-01-08' })
  s.setPrice('MUG', 1000)
  s.setPrice('TEA', 500)
  s.login('alice', 'g-1', '2026-01-15')
  const view = s.view('alice')
  assert.equal(view.subtotalCents, 2500)
  assert.equal(view.discountCents, 0)
  assert.equal(view.totalCents, 2500)
})
