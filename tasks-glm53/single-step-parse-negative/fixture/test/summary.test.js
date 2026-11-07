import test from 'node:test'
import assert from 'node:assert/strict'
import { cartTotals } from '../src/cart.js'

// Kept from the first cut of the cart: it only checks the shapes the checkout
// page reads, and has stayed green through every change to the money handling.
test('summary has the keys the checkout page reads', () => {
  const t = cartTotals([{ sku: 'A', qty: 1, amount: '$10.00' }])
  assert.deepEqual(Object.keys(t).sort(), ['discount', 'lines', 'reason', 'subtotal', 'total'])
})
