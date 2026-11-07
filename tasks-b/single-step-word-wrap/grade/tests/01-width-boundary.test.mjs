// Sub-problem 1: the greedy fit and the exact-width boundary.
import test from 'node:test'
import assert from 'node:assert/strict'
import { wrap, wrapLines } from '../src/index.js'

test('a line that fills the width exactly is not broken', () => {
  assert.equal(wrap('aaa bbb cc', 7), 'aaa bbb\ncc')
})

test('two words that exactly fill the width stay together', () => {
  assert.deepEqual(wrapLines('ab cd', 5), ['ab cd'])
})

test('punctuation counts toward the columns a word occupies', () => {
  assert.equal(wrap('hi, there you', 9), 'hi, there\nyou')
})

test('an exact fit may end anywhere in the paragraph', () => {
  assert.equal(wrap('wxyz abc def', 8), 'wxyz abc\ndef')
})
