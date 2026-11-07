import test from 'node:test'
import assert from 'node:assert/strict'
import { truncate } from '../src/index.js'

test('text that fits is returned unchanged', () => {
  assert.equal(truncate('short', 10), 'short')
  assert.equal(truncate('', 5), '')
})

test('the ellipsis sits inside the limit', () => {
  assert.equal(truncate('hello world', 8), 'hello…')
})

test('an astral character is one code point and is never split', () => {
  assert.equal(truncate('a🙂bcdefgh', 5), 'a🙂bc…')
})
