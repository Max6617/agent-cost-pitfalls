import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, getSection } from '../src/index.js'

test('a quoted value keeps its comment markers', () => {
  const doc = parse('name = "fast ; reliable"\n')
  assert.equal(doc.globals.name, 'fast ; reliable')
})

test('escapes in a quoted value become control characters', () => {
  const doc = parse('msg = "one\\ntwo"\n')
  assert.equal(doc.globals.msg, 'one\ntwo')
})

test('when a key repeats in a section the last value wins', () => {
  const doc = parse('[server]\nhost = a.example\nhost = b.example\n')
  assert.equal(getSection(doc, 'server').host, 'b.example')
})

test('a line ending in a backslash continues on the next line', () => {
  const doc = parse('desc = alpha \\\nbeta\n')
  assert.equal(doc.globals.desc, 'alpha beta')
})

test('section names match without regard to case', () => {
  const doc = parse('[Server]\nhost = a.example\n')
  assert.equal(getSection(doc, 'SERVER').host, 'a.example')
  assert.equal(getSection(doc, 'server').host, 'a.example')
})

test('keys before any section header are global', () => {
  const doc = parse('title = app\n[server]\nhost = a.example\n')
  assert.equal(doc.globals.title, 'app')
  assert.deepEqual(
    doc.sections.map((s) => s.name),
    ['server'],
  )
})
