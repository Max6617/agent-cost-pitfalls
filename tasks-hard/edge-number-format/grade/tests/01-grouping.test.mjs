// Sub-problem 1: where the separators go, and where they are not allowed.
import test from 'node:test'
import assert from 'node:assert/strict'
import { format, group } from '../src/index.js'

test('a four-digit integer part carries its separator', () => {
  assert.equal(format(1234.5), '1,234.50')
  assert.equal(group(98765.4), '98,765.40')
})

test('a three-digit integer part is never given a separator', () => {
  assert.equal(format(999.5), '999.50')
  assert.equal(format(100), '100.00')
  assert.equal(group(5.5), '5.50')
})

test('the separators belong to the integer part and never to the fraction', () => {
  assert.equal(format(1234567, { digits: 4 }), '1,234,567.0000')
  assert.equal(format(1234.5, { digits: 3 }), '1,234.500')
})

test('a negative value is grouped from its first digit, the sign aside', () => {
  assert.equal(format(-9876543.21), '-9,876,543.21')
  assert.equal(format(-999.995), '-1,000.00')
})

test('a value that rounds up across a group boundary', () => {
  assert.equal(format(999.995), '1,000.00')
  assert.equal(format(9999999.995), '10,000,000.00')
})
