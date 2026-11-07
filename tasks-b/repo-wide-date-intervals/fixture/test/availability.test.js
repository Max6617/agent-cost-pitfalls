import test from 'node:test'
import assert from 'node:assert/strict'
import { freeDays } from '../src/index.js'

test('the checkout day is free for the next guest', () => {
  assert.deepEqual(freeDays([{ start: 3, end: 8 }], { start: 1, end: 12 }), [1, 2, 8, 9, 10, 11])
})
