import test from 'node:test'
import assert from 'node:assert/strict'
import { wrap } from '../src/index.js'

test('hard line breaks are preserved, including blank lines', () => {
  assert.equal(wrap('red\n\nblue', 10), 'red\n\nblue')
})

test('trailing whitespace is never emitted', () => {
  assert.equal(wrap('aa bb  ', 4), 'aa\nbb')
})

test('a width below 1 is a RangeError', () => {
  assert.throws(() => wrap('x', 0), RangeError)
  assert.throws(() => wrap('x', -5), RangeError)
})
