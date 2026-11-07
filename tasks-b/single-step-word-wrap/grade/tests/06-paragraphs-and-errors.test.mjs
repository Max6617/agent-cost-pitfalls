// Sub-problem 6: paragraphs, empty input and the documented error.
import test from 'node:test'
import assert from 'node:assert/strict'
import { wrap } from '../src/index.js'

test('hard line breaks and blank lines are preserved', () => {
  assert.equal(wrap('one\n\ntwo', 10), 'one\n\ntwo')
})

test('empty input wraps to empty output', () => {
  assert.equal(wrap('', 10), '')
})

test('a width below 1 is rejected as a RangeError', () => {
  assert.throws(() => wrap('x', 0), RangeError)
  assert.throws(() => wrap('text', -3), RangeError)
})
