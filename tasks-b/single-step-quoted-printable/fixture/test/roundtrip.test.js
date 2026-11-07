import test from 'node:test'
import assert from 'node:assert/strict'
import { encode, decode } from '../src/index.js'

test('round trip keeps tabs and trailing blanks', () => {
  const text = 'a\t \nb  '
  assert.equal(decode(encode(text)), text)
})

test('round trip keeps non-ASCII text on several lines', () => {
  const text = 'héllo\nwörld '
  assert.equal(decode(encode(text)), text)
})

test('round trip survives a line long enough to be folded', () => {
  const text = 'x'.repeat(150) + ' y'
  assert.equal(decode(encode(text)), text)
})
