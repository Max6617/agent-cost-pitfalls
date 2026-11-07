import test from 'node:test'
import assert from 'node:assert/strict'
import { CodecError, decodeToBytes, decodeToString } from '../src/index.js'

test('strict decoding of padded text', () => {
  assert.equal(decodeToString('aGVsbG8='), 'hello')
})

test('url-safe decoding maps - and _ back to 62 and 63', () => {
  assert.deepEqual([...decodeToBytes('-__-', { alphabet: 'url' })], [0xfb, 0xff, 0xfe])
})

test('lenient decoding accepts input with the padding stripped', () => {
  assert.equal(decodeToString('QQ', { mode: 'lenient' }), 'A')
})

test('a dangling single character is rejected, in strict mode', () => {
  assert.throws(() => decodeToBytes('A'), CodecError)
})

test('strict mode rejects whitespace and names where', () => {
  assert.throws(
    () => decodeToBytes('aGvs bG8='),
    (e) => e instanceof CodecError && e.offset === 4,
  )
})
