import test from 'node:test'
import assert from 'node:assert/strict'
import { createCartService } from '../src/index.js'

const SPRING = { code: 'SPRING', percentOff: 10, minSubtotalCents: 5000, validUntil: '2026-12-31' }
const OLD = { code: 'OLD', percentOff: 10, validUntil: '2026-01-31' }

function svc(coupons) {
  return createCartService({
    catalog: [
      { sku: 'MUG', title: 'Enamel mug', priceCents: 1200 },
      { sku: 'TEA', title: 'Green tea', priceCents: 800 },
    ],
    stock: { MUG: 20, TEA: 20 },
    maxPerCustomer: 6,
    coupons,
  })
}

test('a coupon the merged cart does not earn is dropped', () => {
  const s = svc([SPRING])
  s.guestAdd('g-1', { sku: 'TEA', qty: 1, addedAt: '2026-01-10' })
  s.guestCoupon('g-1', 'SPRING', '2026-01-10')
  s.accountAdd('alice', { sku: 'MUG', qty: 1, addedAt: '2026-01-08' })
  s.login('alice', 'g-1', '2026-01-15')
  const view = s.view('alice')
  assert.equal(view.couponCode, null)
  assert.equal(view.totalCents, 2000)
})

test('a coupon past its validity window is dropped at merge', () => {
  const s = svc([OLD])
  s.guestAdd('g-1', { sku: 'TEA', qty: 1, addedAt: '2026-01-10' })
  s.guestCoupon('g-1', 'OLD', '2026-01-10')
  s.login('alice', 'g-1', '2026-02-01')
  assert.equal(s.view('alice').couponCode, null)
})
