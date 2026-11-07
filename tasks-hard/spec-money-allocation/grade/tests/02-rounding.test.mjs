// Sub-problem 2: the five rounding modes of docs/billing-rules.md section 3,
// each on the exact decimal value and each defined for negative values.
import test from 'node:test'
import assert from 'node:assert/strict'
import { roundTo, ROUNDING_MODES } from '../src/index.js'

test('the result is fixed-scale, and the five modes are the ones that exist', () => {
  assert.equal(roundTo('2.674', 2), '2.67')
  assert.equal(roundTo('109'), '109.00')
  assert.equal(roundTo('1.2345', 3), '1.235')
  assert.equal(roundTo('2.5', 2), '2.50')
  assert.equal(roundTo('-2.5', 2), '-2.50')
  assert.equal(roundTo('7', 0), '7')
  assert.deepEqual([...ROUNDING_MODES].sort(), ['ceiling', 'floor', 'half-down', 'half-even', 'half-up'])
  assert.throws(() => roundTo('2.675', 2, 'bankers'))
  assert.throws(() => roundTo('1.5', -1))
})

test('half-up is the nearest value and a tie goes away from zero', () => {
  assert.equal(roundTo('1.005', 2), '1.01')
  assert.equal(roundTo('-1.005', 2), '-1.01')
  assert.equal(roundTo('0.005', 2), '0.01')
  assert.equal(roundTo('1.015', 2), '1.02')
  assert.equal(roundTo('2.675', 2), '2.68')
  assert.equal(roundTo('2.5', 0), '3')
  assert.equal(roundTo('-2.5', 0), '-3')
  assert.equal(roundTo('1.0049999', 2), '1.00')
})

test('half-even breaks a tie toward the even digit, half-down toward zero', () => {
  assert.equal(roundTo('2.5', 0, 'half-even'), '2')
  assert.equal(roundTo('3.5', 0, 'half-even'), '4')
  assert.equal(roundTo('-2.5', 0, 'half-even'), '-2')
  assert.equal(roundTo('-3.5', 0, 'half-even'), '-4')
  assert.equal(roundTo('0.125', 2, 'half-even'), '0.12')
  assert.equal(roundTo('0.135', 2, 'half-even'), '0.14')
  assert.equal(roundTo('-0.125', 2, 'half-even'), '-0.12')
  assert.equal(roundTo('2.5', 0, 'half-down'), '2')
  assert.equal(roundTo('-2.5', 0, 'half-down'), '-2')
  assert.equal(roundTo('1.005', 2, 'half-down'), '1.00')
  assert.equal(roundTo('-1.005', 2, 'half-down'), '-1.00')
  assert.equal(roundTo('1.006', 2, 'half-down'), '1.01')
  assert.equal(roundTo('1.015', 2, 'half-even'), '1.02')
})

test('floor and ceiling go toward their own infinity, and zero is never signed', () => {
  assert.equal(roundTo('2.5', 0, 'floor'), '2')
  assert.equal(roundTo('-2.5', 0, 'floor'), '-3')
  assert.equal(roundTo('1.999', 2, 'floor'), '1.99')
  assert.equal(roundTo('-0.004', 2, 'floor'), '-0.01')
  assert.equal(roundTo('2.5', 0, 'ceiling'), '3')
  assert.equal(roundTo('-2.5', 0, 'ceiling'), '-2')
  assert.equal(roundTo('1.001', 2, 'ceiling'), '1.01')
  assert.equal(roundTo('-0.004', 2, 'ceiling'), '0.00')
  assert.equal(roundTo('-0.004', 2, 'half-up'), '0.00')
  assert.equal(roundTo('-0.004', 2, 'half-even'), '0.00')
})
