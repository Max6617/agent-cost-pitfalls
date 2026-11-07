import test from 'node:test'
import assert from 'node:assert/strict'
import { decimal } from '../src/index.js'

test('decimals add exactly', () => {
  assert.equal(decimal.add('0.1', '0.2'), '0.3')
  assert.equal(decimal.add('1.10', '2.20'), '3.3')
  assert.equal(decimal.sum(['0.01', '0.02', '0.04']), '0.07')
})

test('rounding is half-up away from zero on the exact value', () => {
  assert.equal(decimal.round('1.005'), '1.01')
  assert.equal(decimal.round('-0.005'), '-0.01')
  assert.equal(decimal.round('2.674'), '2.67')
})

test('rounding pads to the scale and never writes a negative zero', () => {
  assert.equal(decimal.round('109'), '109.00')
  assert.equal(decimal.round('-0.0001'), '0.00')
})

test('a value times a rate is exact', () => {
  assert.equal(decimal.mul('0.005', '1.09'), '0.00545')
  assert.equal(decimal.mul('100.00', '1.09'), '109')
})
