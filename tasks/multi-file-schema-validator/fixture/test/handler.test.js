import test from 'node:test'
import assert from 'node:assert/strict'
import { handle } from '../src/handler.js'

/** The body the storefront actually posts. */
const body = {
  reference: 'A-1001',
  customerEmail: 'buyer@example.com',
  quantity: '2',
  unitPrice: '$4.50',
  code: 'standard',
  shipping: { line1: '1 High Street', postcode: 'AB1 2CD', country: 'gb' },
}

test('a good submission is accepted with coerced values', () => {
  const r = handle({ body })
  assert.equal(r.status, 202)
  assert.equal(r.body.order.status, 'accepted')
  assert.equal(r.body.order.quantity, 2)
  assert.equal(r.body.order.unitPrice, 4.5)
  assert.equal(r.body.order.code, 'standard')
})

test('a bad submission returns every problem with a summary', () => {
  const r = handle({ body: { ...body, quantity: '0', code: 'nope' } })
  assert.equal(r.status, 400)
  assert.equal(r.body.error, 'invalid_request')
  assert.equal(r.body.errors.length, 2)
  assert.equal(typeof r.body.summary, 'string')
  assert.match(r.body.summary, /quantity:range/)
})

test('an omitted optional field is not invented', () => {
  const r = handle({ body })
  assert.equal('note' in r.body.order, false)
  assert.equal('tags' in r.body.order, false)
  assert.equal('total' in r.body.order, false)
})
