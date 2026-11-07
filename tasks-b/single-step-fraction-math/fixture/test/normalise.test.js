import test from 'node:test'
import assert from 'node:assert/strict'
import { makeFraction, toString } from '../src/index.js'

test('a fraction reduces to lowest terms', () => {
  assert.equal(toString(makeFraction(2, 4)), '1/2')
  assert.equal(toString(makeFraction(6, 9)), '2/3')
})

test('the sign lives in the numerator', () => {
  assert.equal(toString(makeFraction(-6, 4)), '-3/2')
})
