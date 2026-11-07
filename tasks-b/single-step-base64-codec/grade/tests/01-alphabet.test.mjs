// Sub-problem 1: standard vs url-safe alphabets. The url alphabet writes 62
// as '-' and 63 as '_', and decoding must map them back to exactly those
// values — a byte whose encoding touches the punctuation is not special.
import test from 'node:test'
import assert from 'node:assert/strict'
import { decodeToBytes, encodeBytes } from '../src/index.js'

test('url-safe decoding maps - back to 62', () => {
  assert.deepEqual([...decodeToBytes('-w==', { alphabet: 'url' })], [0xfb])
})

test('url-safe decoding maps _ back to 63', () => {
  assert.deepEqual([...decodeToBytes('__8=', { alphabet: 'url' })], [0xff, 0xff])
})

test('an unpadded url-safe tail keeps both punctuation values', () => {
  // interaction: url alphabet + lenient unpadded decode
  assert.deepEqual(
    [...decodeToBytes('-_s', { alphabet: 'url', mode: 'lenient' })],
    [0xfb, 0xfb],
  )
})

test('bytes round-trip through the url alphabet', () => {
  const bytes = new Uint8Array([0xfb, 0xff, 0xfe])
  const text = encodeBytes(bytes, { alphabet: 'url' })
  assert.equal(text, '-__-')
  assert.deepEqual([...decodeToBytes(text, { alphabet: 'url' })], [...bytes])
})
