// Sub-problem 3: normalization and the documented separator tolerance.
import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeIsbn, isValidIsbn10, isValidIsbn13 } from '../src/index.js'

test('hyphens and spaces between the characters are stripped', () => {
  assert.equal(normalizeIsbn('0-306-40615-2'), '0306406152')
  assert.equal(normalizeIsbn('978 0 306 40615 7'), '9780306406157')
  assert.equal(normalizeIsbn('0-8044-2957-x'), '080442957x')
})

test('a separator never leads or trails', () => {
  assert.equal(normalizeIsbn('-0306406152'), null)
  assert.equal(normalizeIsbn('0306406152 '), null)
  assert.equal(normalizeIsbn(' 9780306406157'), null)
})

test('two separators are never adjacent', () => {
  assert.equal(normalizeIsbn('0--306406152'), null)
  assert.equal(normalizeIsbn('0- 306406152'), null)
  assert.equal(normalizeIsbn('9780306406157-'), null)
})

test('validation applies the same separator rules', () => {
  assert.equal(isValidIsbn10('0 306 40615 2'), true)
  assert.equal(isValidIsbn10('080442957 x'), true)
  assert.equal(isValidIsbn13('978 0 306 40615 7'), true)
})
