// Sub-problem 3: overlong words overflow intact and are never split.
import test from 'node:test'
import assert from 'node:assert/strict'
import { wrap } from '../src/index.js'

test('an overlong word overflows whole on its own line', () => {
  assert.equal(wrap('a supercalifragilistic word', 10), 'a\nsupercalifragilistic\nword')
})

test('an overlong word at the start overflows whole', () => {
  assert.equal(wrap('antidisestablishmentarianism ok', 8), 'antidisestablishmentarianism\nok')
})

test('an overlong word on a continuation line keeps the indent prefix', () => {
  assert.equal(wrap('go pneumonoultramicroscopic now', 12, { indent: 4 }), 'go\n    pneumonoultramicroscopic\n    now')
})

test('a word one column too long still overflows whole', () => {
  assert.equal(wrap('toolongby1 x', 7), 'toolongby1\nx')
})

test('a hyphenated word is one word and is never broken', () => {
  assert.equal(wrap('mother-in-law stays', 8), 'mother-in-law\nstays')
})
