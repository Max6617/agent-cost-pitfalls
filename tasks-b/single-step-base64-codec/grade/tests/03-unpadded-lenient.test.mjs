// Sub-problem 3: lenient decoding of unpadded input. Two leftover characters
// carry one byte, three carry two, and the bits straddle the character
// boundary.
import test from 'node:test'
import assert from 'node:assert/strict'
import { decodeToBytes } from '../src/index.js'

test('two leftover characters decode to one byte', () => {
  assert.deepEqual([...decodeToBytes('QQ', { mode: 'lenient' })], [0x41])
})

test('three leftover characters decode to two bytes', () => {
  assert.deepEqual([...decodeToBytes('QUJ', { mode: 'lenient' })], [0x41, 0x42])
})

test('whitespace is skipped before the partial quantum is read', () => {
  // interaction: lenient whitespace handling + unpadded tail
  assert.deepEqual([...decodeToBytes('\tQU J\r\n', { mode: 'lenient' })], [0x41, 0x42])
})

test('a url-safe partial quantum decodes its punctuation correctly', () => {
  // interaction: url alphabet + unpadded tail
  assert.deepEqual(
    [...decodeToBytes('-w', { alphabet: 'url', mode: 'lenient' })],
    [0xfb],
  )
})
