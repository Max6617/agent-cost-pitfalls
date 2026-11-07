// Sub-problem 3: exact arithmetic and division (§4).
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeFraction, fromString, add, sub, mul, div, toString } from '../src/index.js'

test('addition and subtraction are exact, across zero', () => {
  assert.equal(toString(add(makeFraction(1, 6), makeFraction(1, 3))), '1/2')
  assert.equal(toString(add(makeFraction(1, 10), makeFraction(1, 15))), '1/6')
  assert.equal(toString(sub(makeFraction(1, 2), makeFraction(1, 3))), '1/6')
  assert.equal(toString(sub(makeFraction(1, 3), makeFraction(1, 2))), '-1/6')
})

test('multiplication is exact and reduces, across signs', () => {
  assert.equal(toString(mul(makeFraction(2, 3), makeFraction(3, 4))), '1/2')
  assert.equal(toString(mul(makeFraction(7, 8), makeFraction(4, 5))), '7/10')
  assert.equal(toString(mul(makeFraction(-5, 8), makeFraction(2, 5))), '-1/4')
  assert.equal(toString(mul(makeFraction(0, 5), makeFraction(7, 3))), '0')
})

test('division by zero is a RangeError', () => {
  assert.throws(() => div(makeFraction(1, 2), makeFraction(0, 7)), RangeError)
  assert.throws(() => makeFraction(5, 0), RangeError)
  assert.throws(() => fromString('3/0'), RangeError)
})

test('division is exact, never a rounded decimal', () => {
  assert.equal(toString(div(makeFraction(2, 3), makeFraction(4, 5))), '5/6')
  assert.equal(toString(div(makeFraction(2, 7), makeFraction(3, 4))), '8/21')
  assert.equal(toString(div(makeFraction(5, 6), makeFraction(7, 9))), '15/14')
})

test('division handles unreduced and negative operands exactly', () => {
  assert.equal(toString(div(makeFraction(4, 6), makeFraction(10, 4))), '4/15')
  assert.equal(toString(div(makeFraction(3, -4), makeFraction(9, 2))), '-1/6')
})
