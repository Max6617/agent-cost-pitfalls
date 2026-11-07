// Sub-problem 5: error offsets and round-trip fidelity. Offsets name the
// input as passed, and every byte value survives the round trip.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CodecError,
  decodeToBytes,
  decodeToString,
  encodeBytes,
  encodeString,
} from '../src/index.js'

test('an invalid character names its offset in strict mode', () => {
  assert.throws(
    () => decodeToBytes('aGVsbG8$'),
    (e) => e instanceof CodecError && e.offset === 7,
  )
})

test('an invalid character names its offset in the input as passed, whitespace included', () => {
  // behaviour the visible suite never touches: offsets through lenient skipping
  assert.throws(
    () => decodeToBytes('aG vsbG8$', { mode: 'lenient' }),
    (e) => e instanceof CodecError && e.offset === 8,
  )
})

test('every byte value 0-255 survives the standard round trip', () => {
  const bytes = new Uint8Array(256)
  for (let i = 0; i < 256; i++) bytes[i] = i
  assert.deepEqual([...decodeToBytes(encodeBytes(bytes))], [...bytes])
})

test('bytes with high bits set survive the url round trip', () => {
  const bytes = new Uint8Array([0xfb, 0xff, 0xfe, 0x00, 0x7f, 0x3f])
  const text = encodeBytes(bytes, { alphabet: 'url' })
  assert.deepEqual([...decodeToBytes(text, { alphabet: 'url' })], [...bytes])
})

test('a non-ascii string survives the round trip', () => {
  assert.equal(decodeToString(encodeString('héllo ✓')), 'héllo ✓')
})
