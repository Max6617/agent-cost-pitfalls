// Sub-problem 2: quoted values and the escape table.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../src/index.js'

test('known escapes become control characters', () => {
  const doc = parse('a = "x\\ny\\tz"\n')
  assert.equal(doc.globals.a, 'x\ny\tz')
})

test('an escaped quote and an unknown escape keep their meaning', () => {
  const doc = parse('a = "say \\"hi\\" \\d"\n')
  assert.equal(doc.globals.a, 'say "hi" \\d')
})

test('an unknown escape keeps its backslash', () => {
  const doc = parse('path = "C:\\data\\sites"\n')
  assert.equal(doc.globals.path, 'C:\\data\\sites')
})

test('escapes resolve inside quotes and the trailing comment still strips', () => {
  const doc = parse('a = "x\\ty" ; note\n')
  assert.equal(doc.globals.a, 'x\ty')
})
