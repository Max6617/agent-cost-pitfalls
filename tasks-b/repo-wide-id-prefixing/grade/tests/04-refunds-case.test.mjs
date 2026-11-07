// Sub-problem 4: a refund id body is case-sensitive end to end.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRefund, parseRefundId } from '../src/index.js'

test('a refund id keeps its body case', () => {
  assert.equal(parseRefundId('ref_aB9'), 'ref_aB9')
})

test('a legacy bare refund id keeps its case when canonicalised', () => {
  assert.equal(parseRefundId('aB9'), 'ref_aB9')
})

test('a refund stores the payment reference case-exact', () => {
  const refund = createRefund({ id: 'r7', paymentId: 'pay_qR2', amount: '3.00', reason: 'duplicate' })
  assert.equal(refund.paymentId, 'pay_qR2')
})

test('an all-caps body parses unchanged', () => {
  assert.equal(parseRefundId('ref_Z9Q'), 'ref_Z9Q')
})

test('bodies differing only in case are different ids', () => {
  const lower = parseRefundId('ref_ab1')
  const upper = parseRefundId('ref_AB1')
  assert.equal(lower, 'ref_ab1')
  assert.equal(upper, 'ref_AB1')
  assert.notEqual(lower, upper)
})

test('a refund rejects a non-payment reference as wrong-prefix', () => {
  assert.throws(
    () => createRefund({ id: 'r7', paymentId: 'ord_41', amount: '3.00' }),
    (e) => e.name === 'IdError' && e.code === 'wrong-prefix',
  )
})
