// Sub-problem 5: deduplication against the slugs already in use.
import test from 'node:test'
import assert from 'node:assert/strict'
import { slugify } from '../src/index.js'

test('a taken slug gains a numeric suffix', () => {
  assert.equal(slugify('release notes', { existing: ['release-notes'] }), 'release-notes-2')
})

test('the suffix climbs past numbers that are also taken', () => {
  assert.equal(slugify('release notes', { existing: ['release-notes', 'release-notes-2'] }), 'release-notes-3')
})

test('the first free suffix wins', () => {
  assert.equal(slugify('a b', { existing: ['a-b', 'a-b-2', 'a-b-3'] }), 'a-b-4')
})

test('deduplication runs against the fitted slug', () => {
  assert.equal(slugify('alpha beta', { maxLength: 5, existing: ['alpha', 'alpha-2'] }), 'alpha-3')
})

test('folding decides what deduplication sees', () => {
  assert.equal(slugify('tøy', { existing: ['toy'] }), 'toy-2')
})
