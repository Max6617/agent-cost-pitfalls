// Sub-problem 4: encoding. Every input byte contributes to the output,
// including a final one-byte group, in either padding mode.
import test from 'node:test'
import assert from 'node:assert/strict'
import { encodeBytes, encodeString } from '../src/index.js'

test('a single byte encodes to two characters plus padding', () => {
  assert.equal(encodeString('a'), 'YQ==')
})

test('a trailing single byte after whole quanta is encoded', () => {
  assert.equal(encodeBytes([0xde, 0xad, 0xbe, 0xef]), '3q2+7w==')
})

test('unpadded output still carries the trailing single byte', () => {
  assert.equal(encodeBytes([0xde, 0xad, 0xbe, 0xef], { padding: 'none' }), '3q2+7w')
})

test('a single byte that encodes into url punctuation is not dropped', () => {
  // interaction: trailing single byte + url alphabet + unpadded output
  assert.equal(encodeBytes([0xfb], { alphabet: 'url', padding: 'none' }), '-w')
})
