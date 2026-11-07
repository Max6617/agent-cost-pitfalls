// Sub-problem 1: escape spelling — what stands for itself, what becomes =XX,
// and how the wrap column interacts with an escape's width.
import test from 'node:test'
import assert from 'node:assert/strict'
import { encode, decode } from '../src/index.js'

test('printable ASCII passes through unchanged', () => {
  assert.equal(encode('The quick brown fox (10/10)!'), 'The quick brown fox (10/10)!')
  assert.equal(encode('~tilde & "quotes" <tags>'), '~tilde & "quotes" <tags>')
  assert.equal(encode(''), '')
})

test('escapes are two uppercase hex digits, for control, high and multibyte input', () => {
  assert.equal(encode('é'), '=C3=A9')
  assert.equal(encode('a\x01b'), 'a=01b')
  assert.equal(encode('\x7F\x1B'), '=7F=1B')
  assert.equal(encode('😀'), '=F0=9F=98=80')
})

test('an escape that crosses the wrap column moves whole to the next line', () => {
  // 73 x, then é: '=C3=A9' would end at column 76, past the content limit, so
  // the break goes before it rather than inside it
  assert.equal(encode('x'.repeat(73) + 'é'), 'x'.repeat(73) + '=\n=C3=A9')
})

test('blanks in the middle of a line pass through raw, both ways', () => {
  assert.equal(encode('a\tb c'), 'a\tb c')
  assert.equal(decode('a\tb c'), 'a\tb c')
})
