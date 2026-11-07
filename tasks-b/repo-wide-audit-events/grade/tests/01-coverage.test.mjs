// Sub-problem 1: every mutation lands in the shared audit trail, exactly once.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createShop } from '../src/index.js'

const rita = () => ({ name: 'Rita', email: 'rita@example.com', role: 'member', passwordHash: 'hash:1' })

test('updating an account emits account.update with the state on both sides', () => {
  const shop = createShop()
  const account = shop.accounts.create('rita', rita())
  shop.accounts.update('ops', account.id, { role: 'admin' })

  const events = shop.audit.events()
  assert.equal(events.length, 2)
  assert.equal(events[1].action, 'account.update')
  assert.equal(events[1].entity, 'account')
  assert.equal(events[1].id, account.id)
  assert.equal(events[1].actor, 'ops')
  assert.equal(events[1].before.role, 'member')
  assert.equal(events[1].after.role, 'admin')
  assert.equal(events[1].after.email, 'rita@example.com')
})

test('deactivating an account emits account.deactivate', () => {
  const shop = createShop()
  const account = shop.accounts.create('rita', rita())
  shop.accounts.deactivate('ops', account.id)

  const events = shop.audit.events()
  assert.equal(events.length, 2)
  assert.equal(events[1].action, 'account.deactivate')
  assert.equal(events[1].entity, 'account')
  assert.equal(events[1].id, account.id)
  assert.equal(events[1].before.status, 'active')
  assert.equal(events[1].after.status, 'deactivated')
})

test('creating an account emits a well-formed event with no earlier state', () => {
  const shop = createShop()
  const account = shop.accounts.create('rita', rita())

  const events = shop.audit.events()
  assert.equal(events.length, 1)
  assert.deepEqual(Object.keys(events[0]).sort(), ['action', 'actor', 'after', 'before', 'entity', 'id'])
  assert.equal(events[0].action, 'account.create')
  assert.equal(events[0].entity, 'account')
  assert.equal(events[0].id, account.id)
  assert.equal(events[0].before, null)
  assert.equal(events[0].after.name, 'Rita')
  assert.equal(events[0].after.status, 'active')
  assert.equal(events[0].after.passwordHash, '[redacted]')
})

test('every mutation of a mixed workflow is in the trail, in order', () => {
  const shop = createShop()
  const account = shop.accounts.create('rita', rita())
  shop.inventory.register('rita', { sku: 'sku-1', name: 'Widget', onHand: 4, supplier: { name: 'Acme', unitCost: 41 } })
  shop.accounts.update('ops', account.id, { role: 'admin' })
  shop.pricing.set('ops', 'sku-1', { amount: 79, currency: 'USD', unitCost: 41 })

  const events = shop.audit.events()
  assert.equal(events.length, 4)
  assert.deepEqual(events.map((e) => e.action), [
    'account.create', 'inventory.register', 'account.update', 'price.set',
  ])
})
