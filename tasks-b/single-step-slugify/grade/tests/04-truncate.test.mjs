// Sub-problem 4: length fitting respects word boundaries.
import test from 'node:test'
import assert from 'node:assert/strict'
import { slugify } from '../src/index.js'

test('a slug that exactly fits is left alone', () => {
  assert.equal(slugify('aaaa bbbb', { maxLength: 9 }), 'aaaa-bbbb')
})

test('fitting never cuts a word in half', () => {
  assert.equal(slugify('alpha beta gamma', { maxLength: 12 }), 'alpha-beta')
})

test('fitting never leaves a dangling hyphen', () => {
  assert.equal(slugify('alpha beta gamma', { maxLength: 11 }), 'alpha-beta')
})

test('a single long word is hard cut when no boundary fits', () => {
  assert.equal(slugify('ßßßßßßßßßß', { maxLength: 8 }), 'ssssssss')
})

test('a numeric suffix may exceed the length limit', () => {
  assert.equal(slugify('alpha beta gamma', { maxLength: 11, existing: ['alpha-beta'] }), 'alpha-beta-2')
})
