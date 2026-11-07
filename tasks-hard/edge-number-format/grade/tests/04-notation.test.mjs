// Sub-problem 4: which shape a value is printed in, and the labels.
import test from 'node:test'
import assert from 'node:assert/strict'
import { format, usesScientific } from '../src/index.js'

test('the exponent carries an explicit sign and no leading zeros', () => {
  assert.equal(format(1e21), '1.00e+21')
  assert.equal(format(-1.5e21), '-1.50e+21')
  assert.equal(format(5e-7), '5.00e-7')
})

test('the mantissa keeps the digit count and is never grouped', () => {
  assert.equal(format(1e21, { digits: 3 }), '1.000e+21')
  assert.equal(format(Number.MIN_VALUE), '4.94e-324')
})

test('rounding a plain value over the bound renormalises it', () => {
  assert.equal(format(9.99e20, { significant: 2 }), '1.0e+21')
  assert.equal(format(1e20, { digits: 0 }), '100,000,000,000,000,000,000')
})

test('a value inside the plain range is never given an exponent', () => {
  assert.equal(format(1e12), '1,000,000,000,000.00')
  assert.equal(format(1234567.899), '1,234,567.90')
})

test('zero is never scientific and the labels ignore the options', () => {
  assert.equal(format(0), '0.00')
  assert.equal(usesScientific(0), false)
  assert.equal(format(NaN, { digits: 4 }), 'NaN')
  assert.equal(format(-Infinity), '-Infinity')
})
