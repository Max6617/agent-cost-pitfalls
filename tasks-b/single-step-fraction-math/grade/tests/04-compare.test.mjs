// Sub-problem 4: comparison and ordering (§5).
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeFraction, compare, equals, sort, min, max, toString } from '../src/index.js'

test('two positives order by value', () => {
  assert.equal(compare(makeFraction(2, 3), makeFraction(5, 8)), 1)
  assert.equal(compare(makeFraction(3, 7), makeFraction(1, 2)), -1)
  assert.equal(compare(makeFraction(1, 2), makeFraction(2, 4)), 0)
})

test('two negatives order by reversed magnitude', () => {
  assert.equal(compare(makeFraction(-2, 5), makeFraction(-3, 7)), 1)
  assert.equal(compare(makeFraction(-5, 6), makeFraction(-2, 7)), -1)
})

test('a negative is below every positive, whatever the magnitudes', () => {
  assert.equal(compare(makeFraction(-2, 7), makeFraction(1, 2)), -1)
  assert.equal(compare(makeFraction(1, 2), makeFraction(-2, 7)), 1)
  assert.equal(compare(makeFraction(-2, 7), makeFraction(1, 100)), -1)
})

test('opposites are never equal', () => {
  assert.equal(compare(makeFraction(-3, 4), makeFraction(3, 4)), -1)
  assert.equal(compare(makeFraction(5, 6), makeFraction(-5, 6)), 1)
  assert.equal(equals(makeFraction(3, 4), makeFraction(-3, 4)), false)
  assert.equal(equals(makeFraction(-3, 4), makeFraction(-3, 4)), true)
})

test('sort orders by value across signs', () => {
  const sorted = sort([makeFraction(1, 2), makeFraction(-2, 7), makeFraction(1, 3), makeFraction(0, 1)])
  assert.deepEqual(sorted.map(toString), ['-2/7', '0', '1/3', '1/2'])
})

test('min and max follow the same order', () => {
  assert.equal(toString(min(makeFraction(-2, 7), makeFraction(1, 2))), '-2/7')
  assert.equal(toString(max(makeFraction(1, 2), makeFraction(-2, 7))), '1/2')
  assert.equal(toString(min(makeFraction(3, 4), makeFraction(5, 6))), '3/4')
})
