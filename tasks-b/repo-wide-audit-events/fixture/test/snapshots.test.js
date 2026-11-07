import test from 'node:test'
import assert from 'node:assert/strict'
import { createShop } from '../src/index.js'

const cardOrder = () => ({
  customer: { name: 'Rita', email: 'rita@example.com' },
  items: [{ sku: 'sku-1', qty: 1 }],
  payment: { method: 'card', cardToken: 'tok_abc', last4: '4242' },
})

test('a price update records the price it replaced', () => {
  const shop = createShop()
  shop.pricing.set('rita', 'sku-1', { amount: 10, currency: 'USD', unitCost: 4 })
  shop.pricing.set('rita', 'sku-1', { amount: 25 })

  const event = shop.audit.events()[1]
  assert.equal(event.before.amount, 10)
  assert.equal(event.after.amount, 25)
})

test('two price updates each keep their own before', () => {
  const shop = createShop()
  shop.pricing.set('rita', 'sku-1', { amount: 10, currency: 'USD', unitCost: 4 })
  shop.pricing.set('rita', 'sku-1', { amount: 25 })
  shop.pricing.set('rita', 'sku-1', { amount: 30 })

  const events = shop.audit.events()
  assert.equal(events[1].after.amount, 25)
  assert.equal(events[2].before.amount, 25)
  assert.equal(events[2].after.amount, 30)
})

test('a status change records the status the order was in', () => {
  const shop = createShop()
  const order = shop.orders.create('rita', cardOrder())
  shop.orders.transition('rita', order.id, 'picking')

  const event = shop.audit.events()[1]
  assert.equal(event.before.status, 'pending')
  assert.equal(event.after.status, 'picking')
  assert.equal(event.after.revision, 2)
})

test('a cancellation does not put the reason into the before snapshot', () => {
  const shop = createShop()
  const order = shop.orders.create('rita', cardOrder())
  shop.orders.cancel('ops', order.id, 'customer request')

  const event = shop.audit.events()[1]
  assert.equal(event.before.status, 'pending')
  assert.equal('cancelReason' in event.before, false)
  assert.equal(event.after.status, 'cancelled')
  assert.equal(event.after.cancelReason, 'customer request')
})
