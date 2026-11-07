// Sub-problem 3: allocating one amount across weighted shares, so that the
// parts add back up to the total - docs/billing-rules.md section 4.
import test from 'node:test'
import assert from 'node:assert/strict'
import { allocate, sum, negate } from '../src/index.js'

test('the parts line up with the weights and add back up to the total', () => {
  assert.deepEqual(allocate('100.00', ['1', '2', '3']), ['16.67', '33.33', '50.00'])
  assert.deepEqual(allocate('100.00', ['3', '2', '1']), ['50.00', '33.33', '16.67'])
  assert.deepEqual(allocate('12.34', ['7']), ['12.34'])
  assert.deepEqual(allocate('0.01', ['1', '1', '1']), ['0.01', '0.00', '0.00'])
  assert.deepEqual(allocate('1.00', ['1', '1', '1']), ['0.34', '0.33', '0.33'])
  assert.equal(sum(allocate('1.00', ['1', '1', '1'])), '1')
  assert.throws(() => allocate('1.00', []))
})

test('the units the rounding leaves over go to the shares rounded hardest', () => {
  // exact shares 0.018333, 0.036667 and 0.055: the last one is rounded up the
  // furthest, so it is the one that gives the unit back.
  assert.deepEqual(allocate('0.11', ['1', '2', '3']), ['0.02', '0.04', '0.05'])
  assert.equal(sum(allocate('0.11', ['1', '2', '3'])), '0.11')
  assert.deepEqual(allocate('0.13', ['1', '2', '3']), ['0.02', '0.04', '0.07'])
  assert.deepEqual(allocate('1.05', ['1', '2', '3']), ['0.17', '0.35', '0.53'])
  assert.equal(sum(allocate('1.05', ['1', '2', '3'])), '1.05')
})

test('a zero weight gets zero, and a pool with no proportions is split equally', () => {
  assert.deepEqual(allocate('0.10', ['0', '1', '1', '1']), ['0.00', '0.04', '0.03', '0.03'])
  assert.deepEqual(allocate('1.00', ['0', '0', '0']), ['0.34', '0.33', '0.33'])
  assert.deepEqual(allocate('10.00', ['1', '-1']), ['5.00', '5.00'])
  assert.deepEqual(allocate('0.00', ['0', '0', '0']), ['0.00', '0.00', '0.00'])
  assert.equal(sum(allocate('1.00', ['0', '0', '0'])), '1')
})

test('negative totals and credit lines are allocated like any other amount', () => {
  assert.deepEqual(allocate('-1.00', ['1', '1', '1']), ['-0.34', '-0.33', '-0.33'])
  assert.deepEqual(allocate('-1.00', ['1', '1', '1']), allocate('1.00', ['1', '1', '1']).map(negate))
  assert.deepEqual(allocate('-0.11', ['5', '3', '-2']), ['-0.09', '-0.06', '0.04'])
  assert.equal(sum(allocate('-0.11', ['5', '3', '-2'])), '-0.11')
  assert.deepEqual(allocate('10.00', ['2', '-1', '2']), ['6.66', '-3.33', '6.67'])
  assert.equal(sum(allocate('10.00', ['2', '-1', '2'])), '10')
})

test('the scale and the mode are the caller\'s, not the module\'s', () => {
  // a three-decimal currency: the parts are written at three decimals
  assert.deepEqual(allocate('1.00', ['1', '1', '1'], { scale: 3 }), ['0.334', '0.333', '0.333'])
  assert.deepEqual(allocate('1.005', ['1', '1'], { scale: 3 }), ['0.502', '0.503'])
  assert.equal(sum(allocate('1.005', ['1', '1'], { scale: 3 })), '1.005')
  // a zero-decimal currency
  assert.deepEqual(allocate('1.00', ['1', '1', '1'], { scale: 0 }), ['1', '0', '0'])
  assert.deepEqual(allocate('100', ['1000', '1000', '1000'], { scale: 0 }), ['34', '33', '33'])
  // the mode decides how each exact share is rounded before the leftover moves
  assert.deepEqual(allocate('1.05', ['1', '2', '3'], { mode: 'half-even' }), ['0.18', '0.35', '0.52'])
  assert.equal(sum(allocate('1.05', ['1', '2', '3'], { mode: 'half-even' })), '1.05')
  // a total that is not a whole number of minor units has no answer
  assert.throws(() => allocate('0.005', ['1'], { scale: 2 }))
})
