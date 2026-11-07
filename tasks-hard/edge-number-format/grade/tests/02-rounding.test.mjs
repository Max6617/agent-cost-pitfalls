// Sub-problem 2: rounding, on the decimal value that gets printed.
import test from 'node:test'
import assert from 'node:assert/strict'
import { format } from '../src/index.js'

test('a value is rounded on its last kept digit, not cut short', () => {
  assert.equal(format(1.005), '1.01')
  assert.equal(format(2.675), '2.68')
  assert.equal(format(1.045), '1.05')
})

test('a negative value rounds away from zero, not toward it', () => {
  assert.equal(format(-2.675), '-2.68')
  assert.equal(format(-1.005), '-1.01')
  assert.equal(format(-0.005), '-0.01')
})

test('the digit count below the default pads and rounds', () => {
  assert.equal(format(1.5, { digits: 4 }), '1.5000')
  assert.equal(format(2.5, { digits: 0 }), '3')
  assert.equal(format(12345.678, { digits: 2 }), '12,345.68')
})

test('a carry runs through a chain of nines into the integer part', () => {
  assert.equal(format(999.995), '1,000.00')
  assert.equal(format(0.995, { digits: 2 }), '1.00')
})

test('a negative value that rounds away to nothing loses its sign', () => {
  assert.equal(format(-0.004), '0.00')
  assert.equal(format(-0), '0.00')
  assert.equal(format(-0.005), '-0.01')
  assert.equal(Object.is(format(-0.004), '-0.00'), false)
})
