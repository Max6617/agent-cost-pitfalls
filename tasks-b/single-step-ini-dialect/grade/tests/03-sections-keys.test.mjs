// Sub-problem 3: sections, case folding, global keys, and duplicate keys.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, getSection } from '../src/index.js'

test('keys are case-sensitive while section names are not', () => {
  const doc = parse('[Server]\nHost = a\nhost = b\n')
  assert.equal(doc.sections.length, 1)
  assert.equal(doc.sections[0].name, 'Server')
  assert.equal(getSection(doc, 'SERVER').Host, 'a')
  assert.equal(getSection(doc, 'server').host, 'b')
})

test('a repeated key keeps its last value', () => {
  const doc = parse('[server]\nhost = a.example\nhost = b.example\n')
  assert.equal(getSection(doc, 'server').host, 'b.example')
})

test('a reopened section merges and the later value still wins', () => {
  const doc = parse('[a]\nx = 1\n[b]\ny = 2\n[A]\nx = 9\n')
  assert.equal(doc.sections.length, 2)
  assert.equal(doc.sections[0].name, 'a')
  assert.equal(getSection(doc, 'A').x, '9')
  assert.equal(getSection(doc, 'b').y, '2')
})

test('global keys follow the same last-wins rule', () => {
  const doc = parse('title = one\ntitle = two\n[s]\na = 1\n')
  assert.equal(doc.globals.title, 'two')
})
