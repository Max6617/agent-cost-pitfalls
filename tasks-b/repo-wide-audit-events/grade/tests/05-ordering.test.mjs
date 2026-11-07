// Sub-problem 5: the log preserves the order mutations were applied in,
// including the updates inside a bulk operation.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createShop } from '../src/index.js'

test('a bulk reprice logs its updates in the order they were given', () => {
  const shop = createShop()
  shop.pricing.bulkSet('rita', [
    { sku: 'sku-a', fields: { amount: 5, currency: 'USD', unitCost: 2 } },
    { sku: 'sku-b', fields: { amount: 6, currency: 'USD', unitCost: 3 } },
    { sku: 'sku-c', fields: { amount: 7, currency: 'USD', unitCost: 4 } },
  ])

  const events = shop.audit.events()
  assert.equal(events.length, 3)
  assert.deepEqual(events.map((e) => e.id), ['sku-a', 'sku-b', 'sku-c'])
  assert.deepEqual(events.map((e) => e.action), ['price.set', 'price.set', 'price.set'])
})

test('single updates and a bulk reprice interleave in call order, each with its own before', () => {
  const shop = createShop()
  shop.pricing.set('rita', 'sku-a', { amount: 10, currency: 'USD', unitCost: 4 })
  shop.pricing.bulkSet('rita', [
    { sku: 'sku-b', fields: { amount: 1, currency: 'USD', unitCost: 1 } },
    { sku: 'sku-c', fields: { amount: 2, currency: 'USD', unitCost: 2 } },
  ])
  shop.pricing.set('rita', 'sku-a', { amount: 30 })

  const events = shop.audit.events()
  assert.deepEqual(events.map((e) => e.id), ['sku-a', 'sku-b', 'sku-c', 'sku-a'])
  assert.equal(events[3].before.amount, 10)
  assert.equal(events[3].after.amount, 30)
  assert.equal(events[1].before, null)
})

test('a second bulk reprice appends after the first, in order', () => {
  const shop = createShop()
  shop.pricing.bulkSet('rita', [
    { sku: 'sku-a', fields: { amount: 5, currency: 'USD', unitCost: 2 } },
    { sku: 'sku-b', fields: { amount: 6, currency: 'USD', unitCost: 3 } },
  ])
  shop.pricing.bulkSet('rita', [
    { sku: 'sku-a', fields: { amount: 7 } },
  ])

  const events = shop.audit.events()
  assert.deepEqual(events.map((e) => e.id), ['sku-a', 'sku-b', 'sku-a'])
  assert.equal(events[2].before.amount, 5)
  assert.equal(events[2].after.amount, 7)
})
