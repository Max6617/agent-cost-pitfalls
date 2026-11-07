// Sub-problem 5: round-trip integrity. canonicalize normalises any accepted
// numeral to the canonical form, format(parse(s)) === s exactly when s is
// canonical, and the boundaries round-trip like every other value.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, format, canonicalize } from '../src/index.js'

test('canonicalize normalises every legacy additive form', () => {
  assert.equal(canonicalize('IIII'), 'IV')
  assert.equal(canonicalize('VIIII'), 'IX')
  assert.equal(canonicalize('XXXX'), 'XL')
  assert.equal(canonicalize('LXXXX'), 'XC')
  assert.equal(canonicalize('CCCC'), 'CD')
  assert.equal(canonicalize('DCCCC'), 'CM')
})

test('canonicalize rejects what no mode accepts', () => {
  assert.throws(() => canonicalize('IL'))
  assert.throws(() => canonicalize('VV'))
  assert.throws(() => canonicalize('MMMM'))
})

test('a strict parse followed by a format is the identity on canonical strings', () => {
  for (const s of ['I', 'IV', 'IX', 'XL', 'XC', 'CD', 'CM', 'MMM', 'MMXXIV', 'MMXLV']) {
    assert.equal(format(parse(s, { mode: 'strict' })), s, s)
  }
})

test('the boundary values round-trip through both directions', () => {
  assert.equal(parse(format(1)), 1)
  assert.equal(parse(format(3999)), 3999)
  assert.equal(format(parse('I')), 'I')
  assert.equal(format(parse('MMMCMXCIX')), 'MMMCMXCIX')
})

test('canonicalize is idempotent', () => {
  for (const s of ['XLII', 'CM', 'CDXLIV', 'MMMCMXCIX']) {
    assert.equal(canonicalize(s), s, s)
    assert.equal(canonicalize(canonicalize(s)), s, s)
  }
})
