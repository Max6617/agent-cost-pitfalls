// Sub-problem 5: envelopes read ids the way the convention reads them, and
// wrap records the way the convention emits them.
import test from 'node:test'
import assert from 'node:assert/strict'
import { toDTO, fromDTO } from '../src/index.js'

test('an envelope may carry a legacy bare id', () => {
  const dto = fromDTO({ type: 'user', id: '9Xv', name: 'Ada' })
  assert.equal(dto.id, 'usr_9Xv')
  assert.equal(dto.name, 'Ada')
})

test('an envelope with a typed id round-trips unchanged', () => {
  const dto = fromDTO({ type: 'order', id: 'ord_41', amountCents: 1250 })
  assert.equal(dto.id, 'ord_41')
  assert.equal(dto.amountCents, 1250)
})

test('an envelope carrying another type id is wrong-prefix, not malformed', () => {
  assert.throws(() => fromDTO({ type: 'payment', id: 'ord_41' }), (e) => e.name === 'IdError' && e.code === 'wrong-prefix')
})

test('toDTO canonicalises a record that still holds a bare id', () => {
  const dto = toDTO('refund', { id: 'aB9', paymentId: 'pay_qR2', amountCents: 300, reason: 'duplicate' })
  assert.equal(dto.type, 'refund')
  assert.equal(dto.id, 'ref_aB9')
})
