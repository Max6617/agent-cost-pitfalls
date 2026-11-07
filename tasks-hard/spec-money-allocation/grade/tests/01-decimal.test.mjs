// Sub-problem 1: money is an exact decimal, and it is written the way
// docs/billing-rules.md section 1 says it is written.
import test from 'node:test'
import assert from 'node:assert/strict'
import { add, sub, sum, mul, div, normalize, compare, isZero, isDecimal } from '../src/index.js'

test('addition, subtraction and summation are exact', () => {
  assert.equal(add('0.1', '0.2'), '0.3')
  assert.equal(add('1.10', '2.20'), '3.3')
  assert.equal(add('0.07', '0.01'), '0.08')
  assert.equal(add('50', '59'), '109')
  assert.equal(sub('1', '0.9'), '0.1')
  assert.equal(sub('0.3', '0.1'), '0.2')
  assert.equal(add('0.1', '0.7'), '0.8')
  assert.equal(sum(['0.01', '0.02', '0.04']), '0.07')
  assert.equal(sum(['1.005', '2.005', '-3.01']), '0')
  assert.equal(sum([]), '0')
})

test('multiplication is exact', () => {
  assert.equal(mul('1.005', '100'), '100.5')
  assert.equal(mul('2.675', '100'), '267.5')
  assert.equal(mul('0.005', '1.09'), '0.00545')
  assert.equal(mul('100.00', '1.090000'), '109')
  assert.equal(mul('0.1', '0.1'), '0.01')
  assert.equal(mul('-2', '1.5'), '-3')
  assert.equal(mul('0', '1234.56'), '0')
})

test('output is normalised, never in exponent form, and compares exactly', () => {
  assert.equal(normalize('1.50'), '1.5')
  assert.equal(normalize('109.00'), '109')
  assert.equal(normalize('-0.00'), '0')
  assert.equal(normalize('0.000'), '0')
  assert.equal(add('999999999999999999999', '1'), '1000000000000000000000')
  assert.equal(mul('100000000000', '100000000000'), '10000000000000000000000')
  assert.equal(isDecimal('1e3'), false)
  assert.equal(isDecimal('+1.5'), false)
  assert.equal(isDecimal('.5'), false)
  assert.equal(isDecimal('1.5'), true)
  assert.equal(compare('1.10', '1.1'), 0)
  assert.equal(compare('9007199254740993', '9007199254740992'), 1)
  assert.equal(compare('1.005', '1.0049999'), 1)
  assert.equal(isZero('-0.00'), true)
  assert.equal(isZero('0.01'), false)
})

test('division has an answer only when the answer is exact', () => {
  assert.equal(div('10', '4'), '2.5')
  assert.equal(div('1', '8'), '0.125')
  assert.equal(div('1.5', '0.5'), '3')
  assert.equal(div('-0.25', '0.5'), '-0.5')
  assert.equal(div('0', '7'), '0')
  assert.throws(() => div('1', '0'))
  assert.throws(() => div('1', '3'))
})
