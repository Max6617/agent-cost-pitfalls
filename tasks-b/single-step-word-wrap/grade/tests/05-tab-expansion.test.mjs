// Sub-problem 5: tab expansion per the table, measured in expanded columns.
import test from 'node:test'
import assert from 'node:assert/strict'
import { wrap } from '../src/index.js'

test('a tab advances to the next stop and the expansion counts toward the width', () => {
  assert.equal(wrap('ab\tcd', 8), 'ab\ncd')
})

test('every tab in a line advances from where the previous one stopped', () => {
  assert.equal(wrap('a\tb\tc', 12), 'a       b\nc')
})

test('a tab starting on a stop advances a full stop', () => {
  assert.equal(wrap('12345678\t9', 16), '12345678\n9')
})
