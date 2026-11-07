// Sub-problem 4: policy-listed fields are redacted inside snapshots, at any
// depth, and the key stays with the value replaced by "[redacted]".
import test from 'node:test'
import assert from 'node:assert/strict'
import { createShop } from '../src/index.js'

const cardOrder = (token = 'tok_9') => ({
  customer: { name: 'Rita', email: 'rita@example.com' },
  items: [{ sku: 'sku-1', qty: 1 }],
  payment: { method: 'card', cardToken: token, last4: '4242' },
})

test('a payment token nested in an order event is redacted in both snapshots', () => {
  const shop = createShop()
  const order = shop.orders.create('rita', cardOrder())
  shop.orders.transition('rita', order.id, 'picking')

  const event = shop.audit.events()[1]
  assert.equal(event.before.payment.cardToken, '[redacted]')
  assert.equal(event.after.payment.cardToken, '[redacted]')
  assert.equal(event.after.payment.last4, '4242')
  assert.equal(event.after.payment.method, 'card')
})

test('a policy field inside an array element is redacted too', () => {
  const shop = createShop()
  const order = shop.orders.create('rita', {
    customer: { name: 'Rita', email: 'rita@example.com' },
    items: [{ sku: 'sku-1', qty: 2, unitCost: 13 }],
    payment: { method: 'invoice' },
  })

  const event = shop.audit.events()[0]
  assert.equal(event.after.items[0].unitCost, '[redacted]')
  assert.equal(event.after.items[0].qty, 2)
  assert.equal(shop.orders.get(order.id).items[0].unitCost, 13)
})

test('a changed password hash never reaches the trail', () => {
  const shop = createShop()
  const account = shop.accounts.create('rita', { name: 'Rita', email: 'rita@example.com', role: 'member', passwordHash: 'hash:old' })
  shop.accounts.update('ops', account.id, { passwordHash: 'hash:new' })

  const events = shop.audit.events()
  assert.equal(events.length, 2)
  assert.equal(events[1].before.passwordHash, '[redacted]')
  assert.equal(events[1].after.passwordHash, '[redacted]')
  assert.equal(shop.accounts.get(account.id).passwordHash, 'hash:new')
})

test('redaction replaces the value, it does not delete the key', () => {
  const shop = createShop()
  const order = shop.orders.create('rita', cardOrder('tok_555'))
  shop.orders.cancel('ops', order.id, 'customer request')

  const event = shop.audit.events()[1]
  assert.equal('cardToken' in event.before.payment, true)
  assert.equal('cardToken' in event.after.payment, true)
  assert.equal(event.before.payment.cardToken, '[redacted]')
  assert.equal(event.after.payment.cardToken, '[redacted]')
})
