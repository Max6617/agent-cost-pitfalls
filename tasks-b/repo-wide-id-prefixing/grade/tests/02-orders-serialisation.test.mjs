// Sub-problem 2: an order DTO carries every id in canonical form, exactly once.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createOrder, serializeOrder } from '../src/index.js'

test('an order DTO carries the typed id exactly once', () => {
  const order = createOrder({ id: '41', userId: '9Xv', amount: '12.50' })
  const dto = serializeOrder(order)
  assert.equal(dto.id, 'ord_41')
  assert.equal(dto.amount, '12.50')
})

test('references in an order DTO are single-prefixed too', () => {
  const order = createOrder({ id: '41', userId: '9Xv', amount: '12.50' })
  assert.equal(serializeOrder(order).userId, 'usr_9Xv')
})

test('an order without a payment serialises the reference as null', () => {
  const order = createOrder({ id: '41', userId: '9Xv', amount: '12.50' })
  const dto = serializeOrder(order)
  assert.equal(dto.paymentId, null)
  assert.equal('paymentId' in dto, true)
})

test('a payment reference keeps its prefix and its case in the DTO', () => {
  const order = createOrder({ id: '41', userId: '9Xv', paymentId: 'qR2', amount: '12.50' })
  assert.equal(serializeOrder(order).paymentId, 'pay_qR2')
})
