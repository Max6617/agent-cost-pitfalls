import test from 'node:test'
import assert from 'node:assert/strict'
import { createShop } from '../src/index.js'

test('updating an account lands in the audit trail', () => {
  const shop = createShop()
  const account = shop.accounts.create('rita', { name: 'Rita', email: 'rita@example.com', role: 'member', passwordHash: 'hash:1' })
  shop.accounts.update('ops', account.id, { role: 'admin' })

  const events = shop.audit.events()
  assert.equal(events.length, 2)
  assert.equal(events[1].action, 'account.update')
  assert.equal(events[1].actor, 'ops')
  assert.equal(events[1].after.role, 'admin')
})

test('deactivating an account lands in the audit trail', () => {
  const shop = createShop()
  const account = shop.accounts.create('rita', { name: 'Rita', email: 'rita@example.com', role: 'member', passwordHash: 'hash:1' })
  shop.accounts.deactivate('ops', account.id)

  const events = shop.audit.events()
  assert.equal(events.length, 2)
  assert.equal(events[1].action, 'account.deactivate')
  assert.equal(events[1].after.status, 'deactivated')
})
