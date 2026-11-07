// Sub-problem 4: gaps collapse, and the collapsed gap is what is measured.
import test from 'node:test'
import assert from 'node:assert/strict'
import { wrap } from '../src/index.js'

test('a collapsed run is measured as one space', () => {
  assert.equal(wrap('aa    bb', 5), 'aa bb')
})

test('collapsing happens before any wrap decision', () => {
  assert.equal(wrap('one     two     three', 11), 'one two\nthree')
})

test('several runs in one line all collapse', () => {
  assert.equal(wrap('a  b  c', 5), 'a b c')
})

test('leading and trailing whitespace of a hard line is dropped', () => {
  assert.equal(wrap('  aa bb ', 5), 'aa bb')
})

test('collapsed measurement also holds on indented continuation lines', () => {
  assert.equal(wrap('aa   bb cc', 6, { indent: 2 }), 'aa bb\n  cc')
})
