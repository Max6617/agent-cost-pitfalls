import test from 'node:test'
import assert from 'node:assert/strict'
import { makeFraction, add, div, toString } from '../src/index.js'

test('addition is exact', () => {
  assert.equal(toString(add(makeFraction(1, 2), makeFraction(1, 3))), '5/6')
})

test('division is exact', () => {
  assert.equal(toString(div(makeFraction(2, 3), makeFraction(4, 5))), '5/6')
})

test('division by zero is a RangeError', () => {
  assert.throws(() => div(makeFraction(1, 2), makeFraction(0, 3)), RangeError)
})
