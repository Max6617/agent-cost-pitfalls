// Writing and round-tripping - docs/dialect-spec.md, §8 and §10.5.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, write } from '../src/index.js'

test('an absent field and an empty field are written differently', () => {
  assert.equal(write({ columns: ['a', 'b'], rows: [{ a: '1', b: null }] }), 'a,b\r\n1,\r\n')
  assert.equal(write({ columns: ['a', 'b'], rows: [{ a: '1', b: '' }] }), 'a,b\r\n1,""\r\n')
})

test('a field is quoted only when it has to be, and every record ends with the eol', () => {
  assert.equal(write([['plain', 'a,b', 'say "hi"']], { header: false }), 'plain,"a,b","say ""hi"""\r\n')
})

test('a file that was parsed writes back as itself', () => {
  const text = 'id,note\r\n1,"a,b"\r\n2,"x""y"\r\n'
  assert.equal(write(parse(text)), text)
})
