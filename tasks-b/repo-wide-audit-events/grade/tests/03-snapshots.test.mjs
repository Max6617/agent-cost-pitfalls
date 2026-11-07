// Sub-problem 3: before/after are deep snapshots - later mutation must not leak.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createShop } from '../src/index.js'

test('a price update records the price it replaced', () => {
  const shop = createShop()
  shop.pricing.set('rita', 'sku-1', { amount: 10, currency: 'USD', unitCost: 4 })
  shop.pricing.set('rita', 'sku-1', { amount: 25 })

  const event = shop.audit.events()[1]
  assert.equal(event.before.amount, 10)
  assert.equal(event.before.currency, 'USD')
  assert.equal(event.after.amount, 25)
})

test('mutating the record a method returned does not rewrite the emitted event', () => {
  const shop = createShop()
  shop.pricing.set('rita', 'sku-1', { amount: 10, currency: 'USD', unitCost: 4 })
  const price = shop.pricing.set('rita', 'sku-1', { amount: 25 })
  price.amount = 999

  const event = shop.audit.events()[1]
  assert.equal(event.before.amount, 10)
  assert.equal(event.after.amount, 25)
  assert.equal(shop.audit.events()[0].after.amount, 10)
})

test('redacting a snapshot never redacts the live price', () => {
  const shop = createShop()
  shop.pricing.set('rita', 'sku-1', { amount: 5, currency: 'USD', unitCost: 41 })
  shop.pricing.set('rita', 'sku-1', { amount: 30 })

  assert.equal(shop.pricing.get('sku-1').unitCost, 41)
  const event = shop.audit.events()[1]
  assert.equal(event.before.unitCost, '[redacted]')
  assert.equal(event.after.unitCost, '[redacted]')
})

test('a catalog upsert keeps a stable snapshot of a nested document', () => {
  const shop = createShop()
  shop.catalog.upsert('rita', { sku: 'sku-1', title: 'Widget', category: 'tools', attributes: { colour: 'red', size: 'L' } })
  shop.catalog.upsert('rita', { sku: 'sku-1', title: 'Widget Pro', category: 'tools', attributes: { colour: 'blue', size: 'L' } })

  const events = shop.audit.events()
  assert.equal(events.length, 2)
  assert.equal(events[0].before, null)
  assert.equal(events[0].after.attributes.colour, 'red')
  assert.equal(events[1].before.attributes.colour, 'red')
  assert.equal(events[1].after.attributes.colour, 'blue')
  assert.equal(events[1].before.title, 'Widget')
  assert.equal(events[1].after.title, 'Widget Pro')
})
