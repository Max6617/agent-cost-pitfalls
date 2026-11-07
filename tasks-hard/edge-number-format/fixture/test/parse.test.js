// Reproductions for the reader side: what a pasted report cell or a config value
// is allowed to look like. Some of these are covered by docs/number-format.md.
import test from 'node:test'
import assert from 'node:assert/strict'
import { format, parseNumber, tryParseNumber } from '../src/index.js'

test('a grouped value from a report cell parses back to its number', () => {
  assert.equal(parseNumber('1,234.50'), 1234.5)
})

test('plain, signed and padded values parse', () => {
  assert.equal(parseNumber('1234.5'), 1234.5)
  assert.equal(parseNumber('  +12  '), 12)
})

test('a separator in the wrong place is a typo, not a value', () => {
  assert.throws(() => parseNumber('1,2,3'), RangeError)
  assert.throws(() => parseNumber('12,34'), RangeError)
  assert.equal(tryParseNumber('1,2,3'), undefined)
})

test('a parsed zero is zero, never negative zero', () => {
  assert.equal(parseNumber('-0.00'), 0)
  assert.equal(Object.is(parseNumber('-0.00'), -0), false)
  assert.equal(Object.is(parseNumber(format(-0.004)), -0), false)
})
