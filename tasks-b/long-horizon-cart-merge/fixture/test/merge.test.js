import test from 'node:test'
import assert from 'node:assert/strict'
import { createCartService } from '../src/index.js'

function svc(overrides = {}) {
  return createCartService({
    catalog: [
      { sku: 'MUG', title: 'Enamel mug', priceCents: 1200 },
      { sku: 'TEA', title: 'Green tea', priceCents: 800 },
    ],
    stock: { MUG: 20, TEA: 20 },
    maxPerCustomer: 6,
    ...overrides,
  })
}

test('quantities from both carts are summed and capped at the per-customer maximum', () => {
  const s = svc()
  s.accountAdd('alice', { sku: 'MUG', qty: 4, addedAt: '2026-01-05' })
  s.guestAdd('g-1', { sku: 'MUG', qty: 4, addedAt: '2026-01-10' })
  s.login('alice', 'g-1', '2026-01-15')
  const line = s.view('alice').lines.find((l) => l.sku === 'MUG')
  assert.equal(line.qty, 6)
})

test('the cap follows the stock on hand at merge time', () => {
  const s = svc()
  s.accountAdd('alice', { sku: 'MUG', qty: 2, addedAt: '2026-01-05' })
  s.guestAdd('g-1', { sku: 'MUG', qty: 2, addedAt: '2026-01-10' })
  s.setStock('MUG', 3)
  s.login('alice', 'g-1', '2026-01-15')
  const line = s.view('alice').lines.find((l) => l.sku === 'MUG')
  assert.equal(line.qty, 3)
})

test('guest lines take the catalog price at merge time, not their snapshot', () => {
  const s = svc()
  s.guestAdd('g-1', { sku: 'MUG', qty: 2, addedAt: '2026-01-10' })
  s.setPrice('MUG', 1500)
  s.login('alice', 'g-1', '2026-01-15')
  const line = s.view('alice').lines.find((l) => l.sku === 'MUG')
  assert.equal(line.unitPriceCents, 1500)
  assert.equal(line.lineTotalCents, 3000)
})

test('merged totals use the re-resolved prices', () => {
  const s = svc()
  s.guestAdd('g-1', { sku: 'MUG', qty: 2, addedAt: '2026-01-10' })
  s.accountAdd('alice', { sku: 'TEA', qty: 1, addedAt: '2026-01-08' })
  s.setPrice('MUG', 1000)
  s.setPrice('TEA', 500)
  s.login('alice', 'g-1', '2026-01-15')
  const view = s.view('alice')
  assert.equal(view.subtotalCents, 2500)
  assert.equal(view.totalCents, 2500)
})
