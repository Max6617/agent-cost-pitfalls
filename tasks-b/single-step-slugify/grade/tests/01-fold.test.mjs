// Sub-problem 1: accent folding, and folding's place in the pipeline.
import test from 'node:test'
import assert from 'node:assert/strict'
import { slugify } from '../src/index.js'

test('common accents fold to their base letters', () => {
  assert.equal(slugify('Crème brûlée'), 'creme-brulee')
})

test('ligatures expand to two letters', () => {
  assert.equal(slugify('Œuvres complètes'), 'oeuvres-completes')
})

test('a sharp s folds to ss', () => {
  assert.equal(slugify('Straße'), 'strasse')
})

test('a slashed o folds to o', () => {
  assert.equal(slugify('Smørrebrød'), 'smorrebrod')
})

test('folding happens before length fitting', () => {
  assert.equal(slugify('Æsop fables retold', { maxLength: 12 }), 'aesop-fables')
})
