import test from 'node:test'
import assert from 'node:assert/strict'
import { createOrders } from '../src/index.js'

test('an order added under a legacy spelling shows its canonical status', () => {
  const orders = createOrders()
  orders.add({ id: 'o-1', status: 'dispatched' })
  assert.equal(orders.get('o-1').status, 'in-progress')
})

test('filtering by a status finds orders added under another spelling', () => {
  const orders = createOrders()
  orders.add({ id: 'o-1', status: 'dispatched' })
  orders.add({ id: 'o-2', status: 'in-progress' })
  const found = orders.list({ status: 'in-progress' }).map((r) => r.id)
  assert.deepEqual(found, ['o-1', 'o-2'])
})
