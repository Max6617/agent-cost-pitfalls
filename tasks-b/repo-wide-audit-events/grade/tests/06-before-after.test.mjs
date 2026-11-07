// Sub-problem 6: an event describes the completed mutation - `before` is the
// state the entity was in, `after` is the state the mutation left it in.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createShop } from '../src/index.js'

const cardOrder = (token = 'tok_555') => ({
  customer: { name: 'Rita', email: 'rita@example.com' },
  items: [{ sku: 'sku-1', qty: 1 }],
  payment: { method: 'card', cardToken: token, last4: '4242' },
})

test('a status change records the status the order was actually in', () => {
  const shop = createShop()
  const order = shop.orders.create('rita', cardOrder())
  shop.orders.transition('rita', order.id, 'picking')

  const event = shop.audit.events()[1]
  assert.equal(event.before.status, 'pending')
  assert.equal(event.before.revision, 1)
  assert.equal(event.after.status, 'picking')
  assert.equal(event.after.revision, 2)
})

test('a cancellation does not put the requested change into the before snapshot', () => {
  const shop = createShop()
  const order = shop.orders.create('rita', cardOrder())
  shop.orders.cancel('ops', order.id, 'customer request')

  const event = shop.audit.events()[1]
  assert.equal(event.before.status, 'pending')
  assert.equal('cancelReason' in event.before, false)
  assert.equal(event.after.status, 'cancelled')
  assert.equal(event.after.cancelReason, 'customer request')
  assert.equal(event.after.revision, 2)
})

test('a second status change does not rewrite the first change\'s event', () => {
  const shop = createShop()
  const order = shop.orders.create('rita', cardOrder())
  shop.orders.transition('rita', order.id, 'picking')
  shop.orders.transition('rita', order.id, 'shipped')

  const events = shop.audit.events()
  assert.equal(events[1].after.status, 'picking')
  assert.equal(events[1].after.revision, 2)
  assert.equal(events[2].before.status, 'picking')
  assert.equal(events[2].after.status, 'shipped')
  assert.equal(events[2].after.revision, 3)
})

test('cancelling an order leaves the live payment details alone', () => {
  const shop = createShop()
  const order = shop.orders.create('rita', cardOrder())
  shop.orders.cancel('ops', order.id, 'customer request')

  assert.equal(shop.orders.get(order.id).payment.cardToken, 'tok_555')
  assert.equal(shop.audit.events().length, 2)
})
