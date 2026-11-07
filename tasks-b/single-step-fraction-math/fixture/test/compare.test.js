import test from 'node:test'
import assert from 'node:assert/strict'
import { makeFraction, compare, sort, toString } from '../src/index.js'

test('a negative orders below a positive', () => {
  assert.equal(compare(makeFraction(-2, 7), makeFraction(1, 2)), -1)
})

test('sort orders ascending', () => {
  const sorted = sort([makeFraction(1, 2), makeFraction(1, 3)])
  assert.deepEqual(sorted.map(toString), ['1/3', '1/2'])
})
