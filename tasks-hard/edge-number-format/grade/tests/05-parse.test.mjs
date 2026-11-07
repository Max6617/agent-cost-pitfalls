// Sub-problem 5: reading a number back out of text.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseNumber, tryParseNumber } from '../src/index.js'

test('a separator in the wrong place is refused, not quietly removed', () => {
  assert.throws(() => parseNumber('1,2,3'), RangeError)
  assert.throws(() => parseNumber('12,34'), RangeError)
  assert.throws(() => parseNumber('1234,567'), RangeError)
  assert.equal(tryParseNumber('1,2,3'), undefined)
})

test('a separator is never allowed inside the fraction', () => {
  assert.throws(() => parseNumber('1,234.5,6'), RangeError)
  assert.equal(tryParseNumber('1,234.5,6'), undefined)
})

test('a parsed zero is zero, never negative zero', () => {
  assert.equal(parseNumber('-0.00'), 0)
  assert.equal(Object.is(parseNumber('-0.00'), -0), false)
  assert.equal(Object.is(parseNumber('-0'), -0), false)
})

test('the empty input, whitespace, a lone separator and junk are refused', () => {
  assert.throws(() => parseNumber(''), RangeError)
  assert.throws(() => parseNumber('   '), RangeError)
  assert.throws(() => parseNumber(','), RangeError)
  assert.throws(() => parseNumber('12 monkeys'), RangeError)
})

test('every group holds three digits, wherever it stands', () => {
  assert.throws(() => parseNumber('1,23,456'), RangeError)
  assert.equal(tryParseNumber('1,23,456'), undefined)
  assert.equal(parseNumber('123,456,789'), 123456789)
})
