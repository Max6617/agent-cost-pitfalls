// Sub-problem 4: wrapped lines.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../src/index.js'

test('a trailing backslash joins the next line', () => {
  const doc = parse('msg = one \\\ntwo\n')
  assert.equal(doc.globals.msg, 'one two')
})

test('a wrap can chain across several lines', () => {
  const doc = parse('a = one \\\ntwo \\\nthree\n')
  assert.equal(doc.globals.a, 'one two three')
})

test('a comment on the physical line that completes a wrap still strips', () => {
  const doc = parse('msg = one \\\ntwo ; done\n')
  assert.equal(doc.globals.msg, 'one two')
})

test('a quoted value can wrap and keeps its escapes', () => {
  const doc = parse('msg = "one \\\ntwo\\t"\n')
  assert.equal(doc.globals.msg, 'one two\t')
})
