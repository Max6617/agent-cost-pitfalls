// Sub-problem 5: the order a discount is applied in, and the single point at
// which it is rounded - docs/billing-rules.md section 6.
import test from 'node:test'
import assert from 'node:assert/strict'
import { applyDiscount, percentageOf } from '../src/index.js'

test('the fixed voucher comes off before the percentage', () => {
  assert.equal(applyDiscount('100.00', { fixed: '10', percent: '20' }), '72.00')
  assert.equal(applyDiscount('100.00', { percent: '20', fixed: '10' }), '72.00')
  assert.equal(applyDiscount('10.01', { fixed: '0.005', percent: '50' }), '5.00')
  assert.equal(applyDiscount('5.00', { fixed: '6.00' }), '-1.00')
  assert.equal(applyDiscount('10.00', {}), '10.00')
  assert.equal(applyDiscount('10.00', { percent: '0' }), '10.00')
  assert.equal(applyDiscount('10.00'), '10.00')
})

test('the result is rounded once, at the end, never the discount on its own', () => {
  assert.equal(applyDiscount('0.03', { percent: '50' }), '0.02')
  assert.equal(applyDiscount('0.09', { percent: '10' }), '0.08')
  assert.equal(applyDiscount('12.50', { percent: '7.5' }), '11.56')
  assert.equal(applyDiscount('1.00', { percent: '33.333' }), '0.67')
  assert.equal(applyDiscount('0.09', { fixed: '0.005', percent: '10' }), '0.08')
  assert.equal(applyDiscount('7.00', { percent: '5' }, { scale: 0 }), '7')
})

test('the rounding mode reaches the discount', () => {
  // exact 5.025: half-up and ceiling go up, half-even and floor do not
  assert.equal(applyDiscount('10.05', { percent: '50' }), '5.03')
  assert.equal(applyDiscount('10.05', { percent: '50' }, { mode: 'ceiling' }), '5.03')
  assert.equal(applyDiscount('10.05', { percent: '50' }, { mode: 'half-even' }), '5.02')
  assert.equal(applyDiscount('10.05', { percent: '50' }, { mode: 'floor' }), '5.02')
  assert.equal(applyDiscount('10.05', { percent: '50' }, { mode: 'half-down' }), '5.02')
})

test('the discount figure is exact and unrounded, and the percentage is checked', () => {
  assert.equal(percentageOf('19.99', '7.5'), '1.49925')
  assert.equal(percentageOf('0.03', '10'), '0.003')
  assert.equal(percentageOf('3', '1.1'), '0.033')
  assert.equal(percentageOf('100', '100'), '100')
  assert.throws(() => applyDiscount('10.00', { percent: '150' }))
  assert.throws(() => applyDiscount('10.00', { percent: '-1' }))
  assert.throws(() => applyDiscount('10.00', { percent: 'lots' }))
})
