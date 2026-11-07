// Sub-problem 2: what counts as a word, and what separates them.
import test from 'node:test'
import assert from 'node:assert/strict'
import { slugify } from '../src/index.js'

test('whitespace and punctuation runs collapse to single hyphens', () => {
  assert.equal(slugify('  Hello,   WORLD! '), 'hello-world')
})

test('punctuation between letters separates words', () => {
  assert.equal(slugify('one,two,three'), 'one-two-three')
})

test('an apostrophe is a separator like any other', () => {
  assert.equal(slugify("don't stop"), 'don-t-stop')
})

test('folded characters join words, unfolded ones still separate', () => {
  assert.equal(slugify('smør.brød'), 'smor-brod')
})

test('digits are word characters like letters', () => {
  assert.equal(slugify('4.2 scores'), '4-2-scores')
})
