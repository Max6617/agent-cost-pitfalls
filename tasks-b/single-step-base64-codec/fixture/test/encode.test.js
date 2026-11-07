import test from 'node:test'
import assert from 'node:assert/strict'
import { encodeBytes, encodeString } from '../src/index.js'

test('encoding a whole number of quanta needs no padding', () => {
  assert.equal(encodeString('abc'), 'YWJj')
})

test('a one-byte remainder is encoded, padded out to a quantum', () => {
  assert.equal(encodeString('a'), 'YQ==')
})

test('the url alphabet writes 62 and 63 as - and _', () => {
  assert.equal(encodeBytes([0xfb, 0xff, 0xfe], { alphabet: 'url' }), '-__-')
})
