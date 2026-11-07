// Sub-problem 2: the hanging indent and its share of the budget.
import test from 'node:test'
import assert from 'node:assert/strict'
import { wrap } from '../src/index.js'

test('continuation lines get the indent and the reduced budget', () => {
  assert.equal(wrap('alpha beta gamma delta', 12, { indent: 3 }), 'alpha beta\n   gamma\n   delta')
})

test('a continuation line that fills the reduced budget exactly is not broken', () => {
  assert.equal(wrap('aa bbb cc', 6, { indent: 2 }), 'aa bbb\n  cc')
})

test('an indent of zero behaves like no indent at all', () => {
  assert.equal(wrap('ab cd ef', 5, { indent: 0 }), 'ab cd\nef')
})

test('the indent rule applies afresh inside every hard line', () => {
  assert.equal(wrap('xx yy\npp qq rr ss', 8, { indent: 2 }), 'xx yy\npp qq rr\n  ss')
})
