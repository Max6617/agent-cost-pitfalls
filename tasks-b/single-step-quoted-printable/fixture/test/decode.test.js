import test from 'node:test'
import assert from 'node:assert/strict'
import { decode } from '../src/index.js'

test('uppercase hex escapes decode to their bytes', () => {
  assert.equal(decode('a=3Db'), 'a=b')
  assert.equal(decode('=C3=A9'), 'é')
})

test('lowercase hex decodes the same as uppercase', () => {
  assert.equal(decode('caf=c3=a9'), 'café')
})

test("a bare '=' at the very end of the input is a soft break", () => {
  assert.equal(decode('soft='), 'soft')
})
