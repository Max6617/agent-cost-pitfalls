// Sub-problem 3: a payment read only accepts payment ids (and legacy bare ids).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPayment, parsePaymentId } from '../src/index.js'

test('a payment read rejects a user id as wrong-prefix', () => {
  assert.throws(() => parsePaymentId('usr_9Xv'), (e) => e.name === 'IdError' && e.code === 'wrong-prefix')
})

test('a payment read rejects an order id as wrong-prefix', () => {
  assert.throws(() => parsePaymentId('ord_77'), (e) => e.name === 'IdError' && e.code === 'wrong-prefix')
})

test('creating a payment validates the order reference as an order id', () => {
  assert.throws(
    () => createPayment({ id: 'p1', orderId: 'usr_9Xv', amount: '5.00' }),
    (e) => e.name === 'IdError' && e.code === 'wrong-prefix',
  )
})

test('an unknown prefix is malformed, not wrong-prefix', () => {
  assert.throws(() => parsePaymentId('txn_9Xv'), (e) => e.name === 'IdError' && e.code === 'bad-id')
})
