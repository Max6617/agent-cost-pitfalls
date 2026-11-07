import test from 'node:test'
import assert from 'node:assert/strict'
import { createShop } from '../src/index.js'

const widget = () => ({ sku: 'sku-1', name: 'Widget', onHand: 4, supplier: { name: 'Acme', unitCost: 41 } })

test('a stock movement records before and after like every other module', () => {
  const shop = createShop()
  shop.inventory.register('rita', widget())
  shop.inventory.receive('rita', 'sku-1', 6)

  const event = shop.audit.events()[1]
  assert.equal(event.before.onHand, 4)
  assert.equal(event.after.onHand, 10)
})

test('registering an item has no earlier state', () => {
  const shop = createShop()
  shop.inventory.register('rita', widget())

  const event = shop.audit.events()[0]
  assert.equal(event.before, null)
  assert.equal(event.after.sku, 'sku-1')
})

test('a payment token inside an order never reaches the trail', () => {
  const shop = createShop()
  const order = shop.orders.create('rita', {
    customer: { name: 'Rita', email: 'rita@example.com' },
    items: [{ sku: 'sku-1', qty: 1 }],
    payment: { method: 'card', cardToken: 'tok_abc', last4: '4242' },
  })
  shop.orders.transition('rita', order.id, 'picking')

  const event = shop.audit.events()[1]
  assert.equal(event.after.payment.cardToken, '[redacted]')
  assert.equal(event.after.payment.last4, '4242')
})

test('a bulk reprice logs its updates in the order they were given', () => {
  const shop = createShop()
  shop.pricing.bulkSet('rita', [
    { sku: 'sku-a', fields: { amount: 5, currency: 'USD', unitCost: 2 } },
    { sku: 'sku-b', fields: { amount: 6, currency: 'USD', unitCost: 3 } },
    { sku: 'sku-c', fields: { amount: 7, currency: 'USD', unitCost: 4 } },
  ])

  assert.deepEqual(shop.audit.events().map((e) => e.id), ['sku-a', 'sku-b', 'sku-c'])
})
