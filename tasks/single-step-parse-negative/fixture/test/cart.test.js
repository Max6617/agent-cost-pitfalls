import test from 'node:test'
import assert from 'node:assert/strict'
import { cartTotals, applyDiscount } from '../src/cart.js'

const items = [
  { sku: 'TEA-01', qty: 2, amount: '$8.25' },
  { sku: 'MUG-04', qty: 1, amount: '$14.00' },
]

test('totals a normal cart', () => {
  const t = cartTotals(items)
  assert.equal(t.subtotal, 30.5)
  assert.equal(t.total, 30.5)
  assert.equal(t.lines.length, 2)
  assert.equal(t.lines[0].lineTotal, 16.5)
})

test('a refund line lowers the subtotal', () => {
  const t = cartTotals([...items, { sku: 'REFUND', qty: 1, amount: '(12.50)' }])
  assert.equal(t.subtotal, 18)
})

test('a percentage code takes a share off the subtotal', () => {
  const t = cartTotals(items, 'OFF10')
  assert.equal(t.discount, 3.05)
  assert.equal(t.total, 27.45)
})

test('a fixed code takes a flat amount off', () => {
  const d = applyDiscount(30.5, 'SHIP5')
  assert.equal(d.discount, 5)
  assert.equal(d.total, 25.5)
})

test('an unknown code leaves the order alone and says why', () => {
  const d = applyDiscount(30.5, 'NOPE')
  assert.equal(d.discount, 0)
  assert.equal(d.total, 30.5)
  assert.equal(d.reason, 'unknown-code')
})
