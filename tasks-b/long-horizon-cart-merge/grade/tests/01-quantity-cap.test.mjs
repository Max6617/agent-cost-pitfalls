// Sub-problem 1: same-SKU quantities from both carts are summed, and the sum is
// capped at the smaller of the stock on hand at merge time and the per-customer
// maximum - for the whole merged cart, not for each side of it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createCartService } from '../src/index.js'

function svc(overrides = {}) {
  return createCartService({
    catalog: [
      { sku: 'MUG', title: 'Enamel mug', priceCents: 1200 },
      { sku: 'TEA', title: 'Green tea', priceCents: 800 },
      { sku: 'FIG', title: 'Fig jam', priceCents: 600, availableUntil: '2026-02-01' },
    ],
    stock: { MUG: 20, TEA: 20, FIG: 20 },
    maxPerCustomer: 6,
    ...overrides,
  })
}
const plain = (sku, qty, addedAt) => ({ sku, qty, addedAt })

test('the same SKU from both carts is summed and capped at the per-customer maximum', () => {
  const s = svc()
  s.accountAdd('alice', plain('MUG', 4, '2026-01-05'))
  s.guestAdd('g-1', plain('MUG', 4, '2026-01-10'))
  const result = s.login('alice', 'g-1', '2026-01-15')
  const line = s.view('alice').lines.find((l) => l.sku === 'MUG')
  assert.equal(line.qty, 6)
  assert.equal(line.addedAt, '2026-01-05')
  assert.equal(result.status, 'merged')
})

test('the cap is the stock on hand at merge time when that is the smaller number', () => {
  const s = svc()
  s.accountAdd('alice', plain('MUG', 2, '2026-01-05'))
  s.guestAdd('g-1', plain('MUG', 2, '2026-01-10'))
  s.setStock('MUG', 3)
  s.login('alice', 'g-1', '2026-01-15')
  const line = s.view('alice').lines.find((l) => l.sku === 'MUG')
  assert.equal(line.qty, 3)
})

test('a merge that lands exactly on the cap keeps the full quantity', () => {
  const s = svc()
  s.accountAdd('alice', plain('MUG', 3, '2026-01-05'))
  s.guestAdd('g-1', plain('MUG', 3, '2026-01-10'))
  s.login('alice', 'g-1', '2026-01-15')
  const view = s.view('alice')
  assert.equal(view.lines.length, 1)
  assert.equal(view.lines[0].qty, 6)
})

test('an expired guest line neither merges nor counts toward the cap of what survives', () => {
  const s = svc()
  s.accountAdd('alice', plain('MUG', 5, '2026-01-05'))
  s.guestAdd('g-1', plain('MUG', 5, '2026-01-10'))
  s.guestAdd('g-1', plain('FIG', 2, '2026-01-11'))
  const result = s.login('alice', 'g-1', '2026-03-01')
  const view = s.view('alice')
  assert.equal(view.lines.find((l) => l.sku === 'MUG').qty, 6)
  assert.equal(view.lines.some((l) => l.sku === 'FIG'), false)
  assert.deepEqual(result.droppedSkus, ['FIG'])
})

test('gift-wrapped parcels sit outside the cap', () => {
  const s = svc()
  s.accountAdd('alice', plain('MUG', 4, '2026-01-05'))
  s.guestAdd('g-1', plain('MUG', 4, '2026-01-10'))
  s.guestAdd('g-1', { sku: 'MUG', qty: 2, giftWrap: true, addedAt: '2026-01-11' })
  s.login('alice', 'g-1', '2026-01-15')
  const view = s.view('alice')
  assert.equal(view.lines.find((l) => l.sku === 'MUG' && !l.giftWrap).qty, 6)
  assert.equal(view.lines.find((l) => l.sku === 'MUG' && l.giftWrap).qty, 2)
})

test('a line that outgrew its cap since it was added is pulled back at merge', () => {
  const s = svc()
  s.accountAdd('alice', plain('MUG', 6, '2026-01-05'))
  s.setStock('MUG', 4)
  s.guestAdd('g-1', plain('TEA', 1, '2026-01-10'))
  s.login('alice', 'g-1', '2026-01-15')
  const view = s.view('alice')
  assert.equal(view.lines.find((l) => l.sku === 'MUG').qty, 4)
  assert.equal(view.lines.find((l) => l.sku === 'TEA').qty, 1)
})
