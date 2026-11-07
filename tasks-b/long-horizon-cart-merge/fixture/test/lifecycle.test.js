import test from 'node:test'
import assert from 'node:assert/strict'
import { createCartService } from '../src/index.js'

function svc() {
  return createCartService({
    catalog: [
      { sku: 'MUG', title: 'Enamel mug', priceCents: 1200 },
      { sku: 'SCARF', title: 'Wool scarf', priceCents: 4500 },
      { sku: 'FIG', title: 'Fig jam', priceCents: 600, availableUntil: '2026-02-01' },
    ],
    stock: { MUG: 20, SCARF: 20, FIG: 20 },
    maxPerCustomer: 6,
  })
}

test('expired guest items are dropped at merge', () => {
  const s = svc()
  s.guestAdd('g-1', { sku: 'FIG', qty: 2, addedAt: '2026-01-10' })
  const result = s.login('alice', 'g-1', '2026-03-01')
  assert.deepEqual(result.droppedSkus, ['FIG'])
  assert.equal(s.view('alice').lines.length, 0)
})

test('gift-wrapped parcels never combine, even for a SKU both carts hold', () => {
  const s = svc()
  s.accountAdd('alice', { sku: 'SCARF', qty: 1, addedAt: '2026-01-05' })
  s.guestAdd('g-1', { sku: 'SCARF', qty: 1, giftWrap: true, addedAt: '2026-01-10' })
  s.login('alice', 'g-1', '2026-01-15')
  const lines = s.view('alice').lines
  assert.equal(lines.length, 2)
  assert.equal(lines.find((l) => l.giftWrap).qty, 1)
  assert.equal(lines.find((l) => !l.giftWrap).qty, 1)
})

test('logging in twice with the same token does not merge twice', () => {
  const s = svc()
  s.guestAdd('g-1', { sku: 'MUG', qty: 2, addedAt: '2026-01-10' })
  s.login('alice', 'g-1', '2026-01-15')
  const again = s.login('alice', 'g-1', '2026-01-16')
  assert.equal(again.status, 'already-merged')
  assert.equal(s.view('alice').lines.find((l) => l.sku === 'MUG').qty, 2)
})

test('a merge empties the guest cart', () => {
  const s = svc()
  s.guestAdd('g-1', { sku: 'MUG', qty: 2, addedAt: '2026-01-10' })
  s.login('alice', 'g-1', '2026-01-15')
  assert.equal(s.guestView('g-1').lines.length, 0)
})
