// Sub-problem 5: the rules in combination — parsed values flowing through
// arithmetic, ordering and output, as the calculator actually uses them.
import test from 'node:test'
import assert from 'node:assert/strict'
import { fromString, add, sub, div, equals, sort, toString, toMixedString } from '../src/index.js'

test('parsed mixed numbers sort by their true values', () => {
  const sorted = sort([fromString('1 1/2'), fromString('-1 1/2'), fromString('1 1/4')])
  assert.deepEqual(sorted.map(toString), ['-3/2', '5/4', '3/2'])
})

test('a parsed quotient agrees with exact division', () => {
  const q = div(fromString('2/3'), fromString('4/5'))
  assert.equal(toString(q), '5/6')
  assert.equal(equals(q, fromString('5/6')), true)
})

test('a sum that crosses zero normalises with the sign in front', () => {
  assert.equal(toString(add(fromString('1 1/4'), fromString('-2 1/2'))), '-5/4')
})

test('the mixed view of a negative difference', () => {
  assert.equal(toMixedString(sub(fromString('2 1/4'), fromString('3 1/2'))), '-1 1/4')
})
