// Sub-problem: the orders board and the canonical vocabulary.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createOrders } from '../src/index.js'

test('an order added under a legacy spelling reads back as its canonical status', () => {
  const orders = createOrders()
  orders.add({ id: 'o-1', status: 'dispatched' })
  assert.equal(orders.get('o-1').status, 'in-progress')
})

test('the canonical flow works end to end', () => {
  const orders = createOrders()
  orders.add({ id: 'o-1' })
  assert.equal(orders.get('o-1').status, 'open')
  orders.transition('o-1', 'triaged')
  assert.equal(orders.get('o-1').status, 'triaged')
  assert.equal(orders.list({ status: 'triaged' }).length, 1)
})

test('a legacy transition target is stored in its canonical form', () => {
  const orders = createOrders()
  orders.add({ id: 'o-1', status: 'new' })
  orders.transition('o-1', 'triaged')
  orders.transition('o-1', 'in-progress')
  orders.transition('o-1', 'done')
  assert.equal(orders.get('o-1').status, 'resolved')
})

test('a status filter matches orders whatever spelling they were added under', () => {
  const orders = createOrders()
  orders.add({ id: 'o-1', status: 'dispatched' })
  orders.add({ id: 'o-2', status: 'in-progress' })
  const found = orders.list({ status: 'in-progress' }).map((r) => r.id)
  assert.deepEqual(found, ['o-1', 'o-2'])
})
