// Sub-problem 5: the pinned behaviours around expiry and gift-wrapped parcels -
// availability is inclusive of its last day, parcels never combine - and the way
// they compose with the rest of the merge.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createCartService } from '../src/index.js'

const ACCT = { code: 'ACCT', percentOff: 10, minSubtotalCents: 2000, validUntil: '2026-12-31' }
const GUEST20 = { code: 'GUEST20', percentOff: 20, minSubtotalCents: 100, validUntil: '2026-12-31' }

function svc(overrides = {}) {
  return createCartService({
    catalog: [
      { sku: 'MUG', title: 'Enamel mug', priceCents: 1200 },
      { sku: 'SCARF', title: 'Wool scarf', priceCents: 4500 },
      { sku: 'FIG', title: 'Fig jam', priceCents: 600, availableUntil: '2026-02-01' },
    ],
    stock: { MUG: 20, SCARF: 20, FIG: 20 },
    maxPerCustomer: 6,
    ...overrides,
  })
}

test('an expired guest line is dropped at merge and reported', () => {
  const s = svc()
  s.guestAdd('g-1', { sku: 'FIG', qty: 2, addedAt: '2026-01-10' })
  const result = s.login('alice', 'g-1', '2026-03-01')
  assert.deepEqual(result.droppedSkus, ['FIG'])
  assert.equal(s.view('alice').lines.length, 0)
})

test('a parcel is never combined, even for a SKU both carts hold', () => {
  const s = svc()
  s.accountAdd('alice', { sku: 'SCARF', qty: 1, addedAt: '2026-01-05' })
  s.guestAdd('g-1', { sku: 'SCARF', qty: 1, giftWrap: true, addedAt: '2026-01-10' })
  s.login('alice', 'g-1', '2026-01-15')
  const lines = s.view('alice').lines
  assert.equal(lines.length, 2)
  assert.equal(lines.find((l) => l.giftWrap).qty, 1)
  assert.equal(lines.find((l) => !l.giftWrap).qty, 1)
})

test('a product is available through the whole of its last day, at the price of the moment', () => {
  const s = svc()
  s.guestAdd('g-1', { sku: 'FIG', qty: 1, addedAt: '2026-01-10' })
  s.setPrice('FIG', 700)
  const result = s.login('alice', 'g-1', '2026-02-01')
  const line = s.view('alice').lines.find((l) => l.sku === 'FIG')
  assert.deepEqual(result.droppedSkus, [])
  assert.equal(line.qty, 1)
  assert.equal(line.unitPriceCents, 700)
})

test('a merge applies every rule to the cart as a whole', () => {
  const s = svc({ coupons: [ACCT, GUEST20] })
  s.accountAdd('alice', { sku: 'MUG', qty: 4, addedAt: '2026-01-05' })
  s.accountAdd('alice', { sku: 'SCARF', qty: 1, giftWrap: true, addedAt: '2026-01-06' })
  s.accountCoupon('alice', 'ACCT', '2026-01-07')
  s.guestAdd('g-1', { sku: 'MUG', qty: 3, addedAt: '2026-01-10' })
  s.guestAdd('g-1', { sku: 'FIG', qty: 2, addedAt: '2026-01-11' })
  s.guestCoupon('g-1', 'GUEST20', '2026-01-11')
  s.setPrice('MUG', 1500)
  const result = s.login('alice', 'g-1', '2026-03-01')
  const view = s.view('alice')
  const mug = view.lines.find((l) => l.sku === 'MUG' && !l.giftWrap)
  const parcel = view.lines.find((l) => l.giftWrap)
  assert.equal(mug.qty, 6)
  assert.equal(mug.unitPriceCents, 1500)
  assert.equal(parcel.sku, 'SCARF')
  assert.equal(parcel.qty, 1)
  assert.equal(view.lines.some((l) => l.sku === 'FIG'), false)
  assert.deepEqual(result.droppedSkus, ['FIG'])
  assert.equal(view.couponCode, 'ACCT')
  assert.equal(view.subtotalCents, 13500)
  assert.equal(view.discountCents, 1350)
  assert.equal(view.totalCents, 12150)
  assert.equal(result.couponKept, true)
})
