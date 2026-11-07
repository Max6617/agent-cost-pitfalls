// Sub-problem 3: significant digits, and the places the count is worth.
import test from 'node:test'
import assert from 'node:assert/strict'
import { precise } from '../src/index.js'

test('a count wider than the digits the value has is padded with zeros', () => {
  assert.equal(precise(0.5, 3), '0.500')
  assert.equal(precise(0.125, 4), '0.1250')
})

test('a count narrower than the integer part keeps no fraction at all', () => {
  assert.equal(precise(1234.567, 2), '1,200')
  assert.equal(precise(1234.567, 3), '1,230')
  assert.equal(precise(98765.4321, 4), '98,770')
})

test('a count that reaches past the digits the value has stops there', () => {
  assert.equal(precise(1234.567, 6), '1,234.57')
  assert.equal(precise(1234567.891, 9), '1,234,567.89')
})

test('a carry past the last kept digit grows the integer part', () => {
  assert.equal(precise(999.5, 3), '1,000')
  assert.equal(precise(2.5, 1), '3')
})

test('significant digits are grouped like any other rendering', () => {
  assert.equal(precise(1234.5, 3), '1,230')
  assert.equal(precise(-1234.567, 6), '-1,234.57')
})
