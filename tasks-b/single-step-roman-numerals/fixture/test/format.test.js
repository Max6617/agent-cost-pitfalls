import test from 'node:test'
import assert from 'node:assert/strict'
import { format } from '../src/index.js'

test('formats canonically, with subtractive pairs where they belong', () => {
  assert.equal(format(400), 'CD')
  assert.equal(format(2024), 'MMXXIV')
})

test('values outside 1..3999 are rejected', () => {
  assert.throws(() => format(0))
  assert.throws(() => format(4000))
})
