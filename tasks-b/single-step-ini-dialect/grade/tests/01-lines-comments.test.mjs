// Sub-problem 1: comment markers, inline-comment position, and quote awareness.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, IniParseError } from '../src/index.js'

test('a comment starts at the line start or after whitespace, never mid-token', () => {
  const doc = parse('; header\n# also a header\na = x;b\nb = y ; note\nc = z\t# note\n')
  assert.equal(doc.globals.a, 'x;b')
  assert.equal(doc.globals.b, 'y')
  assert.equal(doc.globals.c, 'z')
})

test('a semicolon inside a quoted value is kept', () => {
  const doc = parse('name = "fast ; reliable"\n')
  assert.equal(doc.globals.name, 'fast ; reliable')
})

test('a hash after whitespace inside a quoted value is kept', () => {
  const doc = parse('note = "left # right"\n')
  assert.equal(doc.globals.note, 'left # right')
})

test('a quoted value keeps its markers and a real trailing comment still strips', () => {
  const doc = parse('a = "x ; y" ; note\nb = "c#d" # note\n')
  assert.equal(doc.globals.a, 'x ; y')
  assert.equal(doc.globals.b, 'c#d')
})

test('a line without = is a syntax error that carries its line number', () => {
  assert.throws(
    () => parse('a = 1\noops\n'),
    (e) => e instanceof IniParseError && e.line === 2,
  )
})
