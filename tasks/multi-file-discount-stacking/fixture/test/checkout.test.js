import test from 'node:test'
import assert from 'node:assert/strict'
import { PROMOTIONS, COUPONS, LOYALTY, loyaltyPercent } from '../src/promotions.js'
import { priceLine, linesTotal } from '../src/lines.js'
import { applyCoupon } from '../src/coupons.js'
import { priceOrder } from '../src/checkout.js'
import { roundMoney } from '../src/round.js'

const TEA = { sku: 'TEA-01', qty: 3, unitPrice: 10 }
const MUG = { sku: 'MUG-04', qty: 2, unitPrice: 14 }

test('a line without a promotion is charged in full', () => {
  const priced = priceLine({ sku: 'KETTLE-9', qty: 2, unitPrice: 40 })
  assert.equal(priced.discount, 0)
  assert.equal(priced.net, 80)
})

test('a multi-buy needs a complete group', () => {
  assert.equal(priceLine({ sku: 'TEA-01', qty: 2, unitPrice: 10 }).discount, 0)
  assert.equal(priceLine({ sku: 'TEA-01', qty: 3, unitPrice: 10 }).discount, 10)
})

test('a multi-buy gives one free unit per complete group', () => {
  const priced = priceLine({ sku: 'TEA-01', qty: 5, unitPrice: 10 })
  assert.equal(priced.groups, 1)
  assert.equal(priced.discount, 10)
  assert.equal(priced.net, 40)
})

test('two complete groups discount twice', () => {
  assert.equal(priceLine({ sku: 'TEA-01', qty: 6, unitPrice: 10 }).discount, 20)
  assert.equal(priceLine({ sku: 'MUG-04', qty: 4, unitPrice: 14 }).discount, 28)
})

test('the lines total is exact', () => {
  assert.equal(linesTotal([TEA, MUG]), 58)
})

test('the loyalty tier is the highest one reached', () => {
  assert.equal(loyaltyPercent(0), 0)
  assert.equal(loyaltyPercent(249), 0)
  assert.equal(loyaltyPercent(250), 3)
  assert.equal(loyaltyPercent(999), 3)
  assert.equal(loyaltyPercent(1000), 7)
  assert.equal(loyaltyPercent(1_000_000), 12)
})

test('a percentage coupon takes a share of what is left', () => {
  assert.equal(applyCoupon('SAVE10', 100).discount, 10)
  assert.equal(applyCoupon('SAVE10', 55.5).discount, 5.55)
})

test('a fixed coupon takes a flat amount off', () => {
  assert.equal(applyCoupon('MINUS5', 100).discount, 5)
})

test('a coupon never takes the total below zero', () => {
  assert.equal(applyCoupon('MINUS5', 2).discount, 2)
})

test('an unknown coupon discounts nothing and says why', () => {
  const applied = applyCoupon('NOPE', 100)
  assert.equal(applied.discount, 0)
  assert.equal(applied.reason, 'unknown-coupon')
})

test('promotions apply to their own lines first', () => {
  const invoice = priceOrder([TEA, MUG])
  assert.equal(invoice.gross, 58)
  assert.equal(invoice.lineOff, 24)
  assert.equal(invoice.total, 34)
})

test('loyalty applies to the subtotal after the line promotions', () => {
  const invoice = priceOrder([TEA, MUG], { lifetimeSpend: 1000 })
  assert.equal(invoice.loyaltyPercent, 7)
  assert.equal(invoice.loyaltyOff, 2.38)
  assert.equal(invoice.total, 31.62)
})

test('a percentage coupon applies after the loyalty discount', () => {
  const invoice = priceOrder([TEA, MUG], { lifetimeSpend: 1000, coupon: 'SAVE10' })
  assert.equal(invoice.couponOff, 3.16)
  assert.equal(invoice.total, 28.46)
})

test('a fixed coupon applies after the loyalty discount', () => {
  const invoice = priceOrder([TEA, MUG], { lifetimeSpend: 250, coupon: 'MINUS5' })
  assert.equal(invoice.loyaltyOff, 1.02)
  assert.equal(invoice.total, 27.98)
})

test('the order of a percentage and a fixed discount is not symmetric', () => {
  const invoice = priceOrder([TEA, MUG], { coupon: 'SAVE10' })
  assert.equal(invoice.total, 30.6)

  const other = priceOrder([TEA, MUG], { coupon: 'MINUS5' })
  assert.equal(other.total, 29)
})

test('an unknown coupon leaves the order alone and is recorded', () => {
  const invoice = priceOrder([TEA, MUG], { coupon: 'NOPE' })
  assert.equal(invoice.reason, 'unknown-coupon')
  assert.equal(invoice.total, 34)
})

test('a coupon cannot drive the total below zero', () => {
  const invoice = priceOrder([{ sku: 'GIFT', qty: 1, unitPrice: 2 }], { coupon: 'MINUS5' })
  assert.equal(invoice.total, 0)
})

test('the total is rounded once, at the end', () => {
  const invoice = priceOrder([{ sku: 'X', qty: 3, unitPrice: 0.105 }])
  assert.equal(invoice.total, 0.32)
})

test('rounding is half away from zero', () => {
  assert.equal(roundMoney(1.005), 1.01)
  assert.equal(roundMoney(2.675), 2.68)
  assert.equal(roundMoney(-1.005), -1.01)
})

test('the invoice records what it applied', () => {
  const invoice = priceOrder([TEA, MUG], { lifetimeSpend: 250, coupon: 'save10' })
  assert.equal(invoice.coupon, 'SAVE10')
  assert.equal(invoice.loyaltyPercent, 3)
  assert.equal(invoice.lines.length, 2)
  assert.equal(invoice.lines[0].groups, 1)
})

test('the promotion tables are the ones the rules describe', () => {
  assert.equal(PROMOTIONS['TEA-01'].buy, 3)
  assert.equal(PROMOTIONS['TEA-01'].payFor, 2)
  assert.equal(COUPONS.SAVE10.kind, 'percent')
  assert.equal(LOYALTY.length, 4)
})
