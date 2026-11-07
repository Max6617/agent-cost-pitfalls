// Sub-problem 2: every module emits the documented six-field event shape.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createShop } from '../src/index.js'

const widget = () => ({ sku: 'sku-1', name: 'Widget', onHand: 4, supplier: { name: 'Acme', unitCost: 41 } })

test('a stock movement event has exactly the six documented fields', () => {
  const shop = createShop()
  shop.inventory.register('rita', widget())
  shop.inventory.receive('rita', 'sku-1', 6)

  const event = shop.audit.events()[1]
  assert.deepEqual(Object.keys(event).sort(), ['action', 'actor', 'after', 'before', 'entity', 'id'])
  assert.equal(event.before.onHand, 4)
  assert.equal(event.after.onHand, 10)
  assert.equal(event.id, 'sku-1')
})

test('registering an item has no earlier state and no private field names', () => {
  const shop = createShop()
  shop.inventory.register('rita', widget())

  const event = shop.audit.events()[0]
  assert.equal(event.before, null)
  assert.equal('previous' in event, false)
  assert.equal('current' in event, false)
  assert.equal(event.after.sku, 'sku-1')
  assert.equal(event.after.onHand, 4)
})

test('inventory mutations reach the shared log under the documented names', () => {
  const shop = createShop()
  shop.inventory.register('rita', widget())
  shop.inventory.receive('rita', 'sku-1', 6)
  shop.inventory.adjust('rita', 'sku-1', -1)

  const events = shop.audit.events()
  assert.equal(events.length, 3)
  assert.deepEqual(events.map((e) => e.action), [
    'inventory.register', 'inventory.receive', 'inventory.adjust',
  ])
  assert.deepEqual(events.map((e) => e.entity), ['inventory', 'inventory', 'inventory'])
  assert.deepEqual(events.map((e) => e.id), ['sku-1', 'sku-1', 'sku-1'])
})

test('the supplier cost inside a stock event is redacted in both snapshots', () => {
  const shop = createShop()
  shop.inventory.register('rita', widget())
  shop.inventory.receive('rita', 'sku-1', 6)

  const event = shop.audit.events()[1]
  assert.equal(event.before.supplier.unitCost, '[redacted]')
  assert.equal(event.after.supplier.unitCost, '[redacted]')
  assert.equal(event.after.supplier.name, 'Acme')
  assert.equal(shop.inventory.get('sku-1').supplier.unitCost, 41)
})
