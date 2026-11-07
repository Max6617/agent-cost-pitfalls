// Sub-problem 4: the minor unit belongs to the currency, not to the toolkit -
// docs/billing-rules.md section 5.
import test from 'node:test'
import assert from 'node:assert/strict'
import { minorUnits, formatAmount, convert } from '../src/index.js'

test('the minor unit is declared per currency', () => {
  assert.equal(minorUnits('USD'), 2)
  assert.equal(minorUnits('EUR'), 2)
  assert.equal(minorUnits('CHF'), 2)
  assert.equal(minorUnits('JPY'), 0)
  assert.equal(minorUnits('KRW'), 0)
  assert.equal(minorUnits('BHD'), 3)
  assert.equal(minorUnits('TND'), 3)
  assert.throws(() => minorUnits('usd'))
  assert.throws(() => minorUnits('XXX'))
})

test('a formatted amount is written at its own currency\'s minor units, once', () => {
  assert.equal(formatAmount('1234.5', 'JPY'), '1235')
  assert.equal(formatAmount('1234', 'JPY'), '1234')
  assert.equal(formatAmount('1234.5', 'USD'), '1234.50')
  assert.equal(formatAmount('1.0005', 'BHD'), '1.001')
  assert.equal(formatAmount('1.0004', 'BHD'), '1.000')
  assert.equal(formatAmount('9.999', 'USD'), '10.00')
  assert.equal(formatAmount('10.005', 'USD'), '10.01')
  assert.equal(formatAmount('1234.5', 'JPY', { mode: 'floor' }), '1234')
  assert.equal(formatAmount('1234.5', 'JPY', { mode: 'ceiling' }), '1235')
})

test('conversion rounds the exact product, at the target currency\'s minor units', () => {
  assert.equal(convert('100.00', '1.0950', 'USD'), '109.50')
  assert.equal(convert('1234', '0.0091', 'USD'), '11.23')
  assert.equal(convert('99.99', '150.25', 'JPY'), '15023')
  assert.equal(convert('1000', '0.000001', 'BHD'), '0.001')
  assert.equal(convert('1.00', '1.005', 'USD'), '1.01')
  assert.equal(convert('1.00', '1.005', 'USD', { mode: 'half-even' }), '1.00')
})

test('a rounded amount is never written with a negative zero', () => {
  assert.equal(formatAmount('-0.0004', 'USD'), '0.00')
  assert.equal(formatAmount('-0.0004', 'USD', { mode: 'ceiling' }), '0.00')
  assert.equal(formatAmount('-0.0004', 'USD', { mode: 'floor' }), '-0.01')
  assert.equal(formatAmount('-0.4', 'JPY'), '0')
  assert.equal(formatAmount('-0.4', 'JPY', { mode: 'ceiling' }), '0')
  assert.equal(convert('-0.0001', '1', 'USD'), '0.00')
  assert.equal(convert('-0.0005', '1', 'USD'), '0.00')
  assert.equal(convert('-0.005', '1', 'USD'), '-0.01')
})
