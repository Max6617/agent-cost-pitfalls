import test from 'node:test'
import assert from 'node:assert/strict'
import { wrap } from '../src/index.js'

test('a line that fills the width exactly is left alone', () => {
  assert.equal(wrap('aaa bbb cc', 7), 'aaa bbb\ncc')
})

test('greedy wrapping packs each line', () => {
  assert.equal(wrap('the quick brown fox jumps', 10), 'the quick\nbrown fox\njumps')
})

test('a hanging indent applies to continuation lines and counts toward the width', () => {
  assert.equal(wrap('alpha beta gamma delta', 12, { indent: 3 }), 'alpha beta\n   gamma\n   delta')
})

test('a word longer than the width overflows whole, on its own line', () => {
  assert.equal(wrap('a supercalifragilistic word', 10), 'a\nsupercalifragilistic\nword')
})

test('runs of spaces collapse and are measured collapsed', () => {
  assert.equal(wrap('one      two', 7), 'one two')
})

test('tabs expand to the next stop before wrapping', () => {
  assert.equal(wrap('x\ty', 6), 'x\ny')
})
