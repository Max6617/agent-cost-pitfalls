import test from 'node:test'
import assert from 'node:assert/strict'
import { roundTo } from '../src/index.js'

test('half-up rounds on the value, not on the nearest double', () => {
  assert.equal(roundTo('1.005', 2), '1.01')
  assert.equal(roundTo('2.674', 2), '2.67')
  assert.equal(roundTo('109'), '109.00')
})

test('a tie in half-even goes to the even digit', () => {
  assert.equal(roundTo('2.5', 0, 'half-even'), '2')
  assert.equal(roundTo('3.5', 0, 'half-even'), '4')
})

test('floor and ceiling go toward their own infinity', () => {
  assert.equal(roundTo('2.5', 0, 'floor'), '2')
  assert.equal(roundTo('-2.5', 0, 'floor'), '-3')
  assert.equal(roundTo('2.5', 0, 'ceiling'), '3')
  assert.equal(roundTo('-2.5', 0, 'ceiling'), '-2')
})
