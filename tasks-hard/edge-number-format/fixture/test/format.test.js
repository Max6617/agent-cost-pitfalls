// Reproductions for the formatting side. A subset: docs/number-format.md is the
// contract, these are the cases the reporting team managed to write down.
import test from 'node:test'
import assert from 'node:assert/strict'
import { format, group, precise, usesScientific } from '../src/index.js'

test('a value renders with the default digit count and groups its integer part', () => {
  assert.equal(format(2), '2.00')
  assert.equal(format(1234567.891), '1,234,567.89')
})

test('a four-digit integer part is grouped', () => {
  assert.equal(group(1000), '1,000.00')
  assert.equal(group(12345.6), '12,345.60')
})

test('the fraction is never grouped', () => {
  assert.equal(format(1234567, { digits: 4 }), '1,234,567.0000')
})

test('half away from zero, on the decimal value that gets printed', () => {
  assert.equal(format(1.005), '1.01')
  assert.equal(format(-0.005), '-0.01')
})

test('a rounding carry crosses a group boundary', () => {
  assert.equal(format(999.995), '1,000.00')
})

test('a negative value that rounds away to zero is not negative zero', () => {
  assert.equal(format(-0.004), '0.00')
  assert.equal(format(-0), '0.00')
})

test('significant digits keep their trailing zeros and their places', () => {
  assert.equal(precise(1.5, 3), '1.50')
  assert.equal(precise(1234.567, 2), '1,200')
})

test('the notation switch is at the documented exponent', () => {
  assert.equal(format(1e21), '1.00e+21')
  assert.equal(usesScientific(1e21), true)
  assert.equal(usesScientific(1e11), false)
})
