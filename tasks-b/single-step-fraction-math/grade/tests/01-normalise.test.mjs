// Sub-problem 1: normalisation and canonical form (docs/fraction-rules.md §2, §6).
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeFraction, negate, abs, sub, toString, toMixedString } from '../src/index.js'

test('a positive fraction reduces to lowest terms', () => {
  assert.equal(toString(makeFraction(6, 9)), '2/3')
  assert.equal(toString(makeFraction(14, 4)), '7/2')
  assert.equal(toMixedString(makeFraction(14, 4)), '3 1/2')
})

test('the sign always lives in the numerator', () => {
  const f = makeFraction(-6, 4)
  assert.equal(f.n, -3)
  assert.equal(f.d, 2)
  assert.equal(toString(f), '-3/2')
  assert.equal(toString(makeFraction(3, -9)), '-1/3')
  assert.equal(toString(makeFraction(-5, -10)), '1/2')
})

test('zero is 0/1 however it is written, and derived values stay canonical', () => {
  assert.equal(toString(makeFraction(0, -7)), '0')
  assert.equal(makeFraction(0, -7).d, 1)
  assert.equal(toString(negate(makeFraction(1, 2))), '-1/2')
  assert.equal(toString(abs(makeFraction(-1, 2))), '1/2')
})

test('reduction holds when the remainder chain crosses signs', () => {
  assert.equal(toString(makeFraction(-2, 8)), '-1/4')
  assert.equal(toString(makeFraction(-9, 6)), '-3/2')
  assert.equal(toString(sub(makeFraction(1, 3), makeFraction(1, 2))), '-1/6')
})

test('the mixed view carries the sign on the whole value', () => {
  assert.equal(toMixedString(makeFraction(-7, 3)), '-2 1/3')
  assert.equal(toMixedString(makeFraction(11, 4)), '2 3/4')
  assert.equal(toMixedString(makeFraction(-4, 2)), '-2')
})
