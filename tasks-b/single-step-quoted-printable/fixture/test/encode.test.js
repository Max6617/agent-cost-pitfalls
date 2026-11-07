import test from 'node:test'
import assert from 'node:assert/strict'
import { encode } from '../src/index.js'

test('printable ASCII passes through unchanged', () => {
  assert.equal(encode('Hello, world!'), 'Hello, world!')
})

test('equals and non-ASCII bytes are escaped with uppercase hex', () => {
  assert.equal(encode('2+2=4'), '2+2=3D4')
  assert.equal(encode('é'), '=C3=A9')
})

test('blanks at the end of a line are encoded, whatever line it is', () => {
  assert.equal(encode('a  \nb'), 'a=20=20\nb')
})

test('a long line is folded so no emitted line exceeds 76 characters', () => {
  assert.equal(encode('x'.repeat(80)), 'x'.repeat(75) + '=\n' + 'x'.repeat(5))
})
