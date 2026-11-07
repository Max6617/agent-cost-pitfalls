import test from 'node:test'
import assert from 'node:assert/strict'
import { validate } from '../src/validate.js'
import { coerce, parseList } from '../src/coerce.js'

/** A submission that is valid in every respect; cases below break one thing. */
function good(overrides = {}) {
  return {
    reference: 'A-1001',
    customerEmail: 'buyer@example.com',
    quantity: '2',
    unitPrice: '$4.50',
    code: 'exp',
    tags: 'gift, fragile',
    shipping: { line1: '1 High Street', postcode: 'AB1 2CD', country: 'gb' },
    ...overrides,
  }
}

function codes(result) {
  return result.errors.map((e) => e.field + ':' + e.code).sort()
}

test('a well-formed submission is accepted and coerced', () => {
  const r = validate(good(), 'order')
  assert.equal(r.valid, true)
  assert.deepEqual(r.errors, [])
  assert.equal(r.value.quantity, 2)
  assert.equal(r.value.unitPrice, 4.5)
  assert.equal(r.value.code, 'exp')
  assert.deepEqual(r.value.tags, ['gift', 'fragile'])
  assert.deepEqual(r.value.shipping, { line1: '1 High Street', postcode: 'AB1 2CD', country: 'gb' })
})

test('a coercible string is accepted for a numeric field', () => {
  const r = validate(good({ quantity: ' 12 ', unitPrice: '19.99', total: '39.98' }), 'order')
  assert.equal(r.valid, true)
  assert.equal(r.value.quantity, 12)
  assert.equal(r.value.total, 39.98)
})

test('a zero quantity is rejected for being out of range, not for being falsy', () => {
  const r = validate(good({ quantity: '0' }), 'order')
  assert.equal(r.valid, false)
  assert.deepEqual(codes(r), ['quantity:range'])
})

test('a fractional quantity is rejected as a type error', () => {
  const r = validate(good({ quantity: '2.5' }), 'order')
  assert.equal(r.valid, false)
  assert.deepEqual(codes(r), ['quantity:type'])
})

test('a quantity above the maximum is rejected', () => {
  const r = validate(good({ quantity: '100' }), 'order')
  assert.deepEqual(codes(r), ['quantity:range'])
})

test('a missing reference is rejected', () => {
  const r = validate(good({ reference: undefined }), 'order')
  assert.deepEqual(codes(r), ['reference:required'])
})

test('an empty reference is rejected', () => {
  const r = validate(good({ reference: '   ' }), 'order')
  assert.deepEqual(codes(r), ['reference:required'])
})

test('an enum value of the wrong case is still accepted', () => {
  const r = validate(good({ code: 'EXP' }), 'order')
  assert.equal(r.valid, true)
  assert.equal(r.value.code, 'EXP')
})

test('an unknown enum value is rejected', () => {
  const r = validate(good({ code: 'teleport' }), 'order')
  assert.deepEqual(codes(r), ['code:enum'])
})

test('a note longer than the limit is rejected', () => {
  const r = validate(good({ note: 'x'.repeat(281) }), 'order')
  assert.deepEqual(codes(r), ['note:length'])
})

test('a note exactly at the limit is accepted', () => {
  const r = validate(good({ note: 'x'.repeat(280) }), 'order')
  assert.equal(r.valid, true)
})

test('checkbox words are read as booleans', () => {
  assert.equal(validate(good({ expedited: 'on' }), 'order').value.expedited, true)
  assert.equal(validate(good({ expedited: 'no' }), 'order').value.expedited, false)
})

test('an unreadable boolean is a type error', () => {
  const r = validate(good({ expedited: 'maybe' }), 'order')
  assert.deepEqual(codes(r), ['expedited:type'])
})

test('a total of zero is a legitimate value, not a missing one', () => {
  const r = validate(good({ total: '0' }), 'order')
  assert.equal(r.valid, true)
  assert.equal(r.value.total, 0)
})

test('a missing optional field is simply absent', () => {
  const r = validate(good(), 'order')
  assert.equal(r.valid, true)
  assert.equal('total' in r.value, false)
  assert.equal('note' in r.value, false)
})

test('an absent shipping block is reported against the nested field', () => {
  const r = validate(good({ shipping: undefined }), 'order')
  assert.equal(r.valid, false)
  assert.deepEqual(codes(r), ['shipping:required'])
})

test('a bad nested value is named with its dot path', () => {
  const r = validate(good({ shipping: { line1: '', postcode: 'AB1 2CD', country: 'gb' } }), 'order')
  assert.deepEqual(codes(r), ['shipping.line1:required'])
})

test('a nested enum is compared case-insensitively too', () => {
  const r = validate(good({ shipping: { line1: '1 High Street', postcode: 'AB1 2CD', country: 'GB' } }), 'order')
  assert.equal(r.valid, true)
})

test('every problem is reported, not just the first', () => {
  const r = validate({ quantity: '0', unitPrice: 'free', code: 'teleport' }, 'order')
  assert.equal(r.valid, false)
  assert.deepEqual(codes(r), [
    'code:enum',
    'customerEmail:required',
    'quantity:range',
    'reference:required',
    'shipping:required',
    'unitPrice:type',
  ])
})

test('a body that is not an object is rejected once', () => {
  const r = validate('not-an-object', 'order')
  assert.equal(r.valid, false)
  assert.equal(r.errors.length, 1)
})

test('an empty list stays a list instead of becoming a type error', () => {
  assert.deepEqual(parseList(''), [])
  const r = validate(good({ tags: '' }), 'order')
  assert.equal(r.valid, true)
})

test('a JSON list in a string is read as a list', () => {
  assert.deepEqual(parseList('["a","b"]'), ['a', 'b'])
  const r = validate(good({ tags: '["a","b"]' }), 'order')
  assert.equal(r.valid, true)
  assert.deepEqual(r.value.tags, ['a', 'b'])
})

test('the coercers leave usable falsy values alone', () => {
  assert.equal(coerce('number', '0'), 0)
  assert.equal(coerce('boolean', 'false'), false)
  assert.equal(coerce('string', ''), '')
})
