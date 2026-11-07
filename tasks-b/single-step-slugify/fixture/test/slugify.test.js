import test from 'node:test'
import assert from 'node:assert/strict'
import { slugify } from '../src/index.js'

test('a plain title lowercases and hyphenates', () => {
  assert.equal(slugify('Hello, World!'), 'hello-world')
})

test('existing hyphens are preserved as word boundaries', () => {
  assert.equal(slugify('well-known'), 'well-known')
})

test('punctuation between words collapses to single hyphens', () => {
  assert.equal(slugify('one,two,three'), 'one-two-three')
})

test('a ligature folds to its ascii expansion', () => {
  assert.equal(slugify('Œuvre'), 'oeuvre')
})

test('a sharp s folds to ss', () => {
  assert.equal(slugify('Straße'), 'strasse')
})
