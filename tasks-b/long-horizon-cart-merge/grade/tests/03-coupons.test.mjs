// Sub-problem 3: a coupon survives a merge only if it qualifies for the merged
// contents - its window, its minimum subtotal at the re-resolved prices, and its
// required SKU still being there. The account's coupon outranks the guest's.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createCartService } from '../src/index.js'

const SPRING = { code: 'SPRING', percentOff: 10, minSubtotalCents: 5000, validUntil: '2026-12-31' }
const FIGFAN = { code: 'FIGFAN', percentOff: 15, requiredSku: 'FIG', validUntil: '2026-12-31' }
const BIG = { code: 'BIG', percentOff: 10, minSubtotalCents: 5000, validUntil: '2026-12-31' }
const SMALL = { code: 'SMALL', percentOff: 20, minSubtotalCents: 1000, validUntil: '2026-12-31' }
const OLD = { code: 'OLD', percentOff: 10, validUntil: '2026-01-31' }
const TEN = { code: 'TEN', percentOff: 10, minSubtotalCents: 1000, validUntil: '2026-12-31' }

function svc({ coupons, mugPrice = 1200 }) {
  return createCartService({
    catalog: [
      { sku: 'MUG', title: 'Enamel mug', priceCents: mugPrice },
      { sku: 'TEA', title: 'Green tea', priceCents: 800 },
      { sku: 'FIG', title: 'Fig jam', priceCents: 600, availableUntil: '2026-02-01' },
    ],
    stock: { MUG: 20, TEA: 20, FIG: 20 },
    maxPerCustomer: 6,
    coupons,
  })
}

test('a coupon the merged cart no longer earns is dropped', () => {
  const s = svc({ coupons: [SPRING] })
  s.guestAdd('g-1', { sku: 'TEA', qty: 1, addedAt: '2026-01-10' })
  s.guestCoupon('g-1', 'SPRING', '2026-01-10')
  s.accountAdd('alice', { sku: 'MUG', qty: 1, addedAt: '2026-01-08' })
  const result = s.login('alice', 'g-1', '2026-01-15')
  const view = s.view('alice')
  assert.equal(view.couponCode, null)
  assert.equal(view.discountCents, 0)
  assert.equal(view.totalCents, 2000)
  assert.equal(result.couponKept, false)
})

test('a coupon whose required SKU was dropped at merge goes with it', () => {
  const s = svc({ coupons: [FIGFAN] })
  s.guestAdd('g-1', { sku: 'FIG', qty: 2, addedAt: '2026-01-10' })
  s.guestCoupon('g-1', 'FIGFAN', '2026-01-10')
  const result = s.login('alice', 'g-1', '2026-03-01')
  const view = s.view('alice')
  assert.equal(view.lines.some((l) => l.sku === 'FIG'), false)
  assert.equal(view.couponCode, null)
  assert.equal(result.couponKept, false)
})

test('a coupon past its validity window is dropped at merge', () => {
  const s = svc({ coupons: [OLD] })
  s.guestAdd('g-1', { sku: 'TEA', qty: 1, addedAt: '2026-01-10' })
  s.guestCoupon('g-1', 'OLD', '2026-01-10')
  s.login('alice', 'g-1', '2026-02-01')
  assert.equal(s.view('alice').couponCode, null)
})

test('the account coupon outranks the guest coupon, and losing it opens no fallback', () => {
  const s = svc({ coupons: [BIG, SMALL] })
  s.accountAdd('alice', { sku: 'MUG', qty: 1, addedAt: '2026-01-08' })
  s.accountCoupon('alice', 'BIG', '2026-01-08')
  s.guestAdd('g-1', { sku: 'TEA', qty: 1, addedAt: '2026-01-10' })
  s.guestCoupon('g-1', 'SMALL', '2026-01-10')
  s.login('alice', 'g-1', '2026-01-15')
  const view = s.view('alice')
  assert.equal(view.couponCode, null)
  assert.equal(view.discountCents, 0)
  assert.equal(view.totalCents, 2000)
})

test('a surviving coupon discounts the re-resolved subtotal, rounded half up', () => {
  const s = svc({ coupons: [TEN], mugPrice: 1250 })
  s.guestAdd('g-1', { sku: 'MUG', qty: 3, addedAt: '2026-01-10' })
  s.guestCoupon('g-1', 'TEN', '2026-01-10')
  s.setPrice('MUG', 1335)
  s.login('alice', 'g-1', '2026-01-15')
  const view = s.view('alice')
  assert.equal(view.couponCode, 'TEN')
  assert.equal(view.subtotalCents, 4005)
  assert.equal(view.discountCents, 401)
  assert.equal(view.totalCents, 3604)
})
