// Sub-problem 3: stopwords are dropped only between words, never at an edge.
import test from 'node:test'
import assert from 'node:assert/strict'
import { slugify } from '../src/index.js'

test('a leading stopword is kept', () => {
  assert.equal(slugify('the rain in spain'), 'the-rain-spain')
})

test('a trailing stopword is kept', () => {
  assert.equal(slugify('the sound of'), 'the-sound-of')
})

test('first and last words survive even when every word is a stopword', () => {
  assert.equal(slugify('the and the'), 'the-the')
})

test('stopword handling decides what deduplication sees', () => {
  assert.equal(slugify('the gutenberg', { existing: ['gutenberg'] }), 'the-gutenberg')
})

test('stopwords are dropped before length fitting', () => {
  assert.equal(slugify('of mice and men and other stories', { maxLength: 20 }), 'of-mice-men-other')
})
