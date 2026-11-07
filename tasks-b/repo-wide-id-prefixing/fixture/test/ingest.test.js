import test from 'node:test'
import assert from 'node:assert/strict'
import { idkit, parsePaymentId, parseRefundId, fromDTO } from '../src/index.js'

test('a payment id with another type prefix is rejected', () => {
  assert.throws(() => parsePaymentId('usr_9Xv'), (e) => e.code === 'wrong-prefix')
})

test('an envelope may carry a legacy bare id', () => {
  const dto = fromDTO({ type: 'user', id: '9Xv', name: 'Ada' })
  assert.equal(dto.id, 'usr_9Xv')
})

test('a legacy bare refund id keeps its case when canonicalised', () => {
  assert.equal(parseRefundId('aB9'), 'ref_aB9')
})

test('idkit reads a canonical id unchanged and canonicalises a bare one', () => {
  assert.equal(idkit.parse('order', 'ord_41'), 'ord_41')
  assert.equal(idkit.parse('user', '9Xv'), 'usr_9Xv')
})
