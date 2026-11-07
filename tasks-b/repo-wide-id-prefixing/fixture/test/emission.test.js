import test from 'node:test'
import assert from 'node:assert/strict'
import { createUser, serializeUser, createOrder, serializeOrder, parseRefundId } from '../src/index.js'

test('a created user carries its public id', () => {
  const user = createUser({ id: '9Xv', name: 'Ada', email: 'ada@example.com' })
  assert.equal(user.id, 'usr_9Xv')
})

test('a serialised user carries the typed id, not the legacy body', () => {
  const user = createUser({ id: '9Xv', name: 'Ada', email: null })
  assert.equal(serializeUser(user).id, 'usr_9Xv')
})

test('a serialised order carries the typed id exactly once', () => {
  const order = createOrder({ id: '41', userId: '9Xv', amount: '12.50' })
  assert.equal(serializeOrder(order).id, 'ord_41')
})

test('the user reference on an order DTO is the typed id, exactly once', () => {
  const order = createOrder({ id: '41', userId: '9Xv', amount: '12.50' })
  assert.equal(serializeOrder(order).userId, 'usr_9Xv')
})

test('a refund id keeps the case of its body', () => {
  assert.equal(parseRefundId('ref_aB9'), 'ref_aB9')
})
