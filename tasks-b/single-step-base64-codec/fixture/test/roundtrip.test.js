import test from 'node:test'
import assert from 'node:assert/strict'
import { decodeToBytes, decodeToString, encodeBytes, encodeString } from '../src/index.js'

test('a text round trip through the standard alphabet', () => {
  assert.equal(decodeToString(encodeString('hello world')), 'hello world')
})

test('a binary round trip keeps a trailing single byte', () => {
  const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef])
  assert.deepEqual([...decodeToBytes(encodeBytes(bytes))], [...bytes])
})

test('a binary round trip through the url alphabet', () => {
  const bytes = new Uint8Array([250, 251, 252, 253])
  const text = encodeBytes(bytes, { alphabet: 'url' })
  assert.deepEqual([...decodeToBytes(text, { alphabet: 'url' })], [...bytes])
})
