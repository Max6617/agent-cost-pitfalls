// Sub-problem 2: padding and length rules. Strict input is whole quanta with
// the padding present; a length of 4n+1 is never decodable in any mode.
import test from 'node:test'
import assert from 'node:assert/strict'
import { CodecError, decodeToBytes, decodeToString } from '../src/index.js'

test('a single dangling character is rejected in strict mode', () => {
  assert.throws(() => decodeToBytes('A'), CodecError)
})

test('a whole quantum plus one extra character is rejected in strict mode', () => {
  assert.throws(() => decodeToBytes('AAAAA'), CodecError)
})

test('a single dangling character is rejected in lenient mode too', () => {
  assert.throws(() => decodeToBytes('A', { mode: 'lenient' }), CodecError)
})

test('strict mode accepts unpadded input when no padding was needed', () => {
  assert.equal(decodeToString('QUJD'), 'ABC')
})
