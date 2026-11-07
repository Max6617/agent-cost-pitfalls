import test from 'node:test'
import assert from 'node:assert/strict'
import { slugify } from '../src/index.js'

test('stopwords between words are dropped', () => {
  assert.equal(slugify('cats and dogs'), 'cats-dogs')
})

test('a stopword at the front of the title is kept', () => {
  assert.equal(slugify('The Rain in Spain'), 'the-rain-spain')
})

test('length fitting respects word boundaries', () => {
  assert.equal(slugify('alpha beta gamma', { maxLength: 11 }), 'alpha-beta')
})

test('a taken slug gains a numeric suffix', () => {
  assert.equal(slugify('release notes', { existing: ['release-notes'] }), 'release-notes-2')
})

test('the suffix climbs when the numbered slug is also taken', () => {
  assert.equal(slugify('a b', { existing: ['a-b', 'a-b-2'] }), 'a-b-3')
})
