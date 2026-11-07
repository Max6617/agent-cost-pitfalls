// Sub-problem 2: the ISBN-13 check digit and validation of ISBN-13s.
import test from 'node:test'
import assert from 'node:assert/strict'
import { isbn13CheckDigit, isValidIsbn13 } from '../src/index.js'

test('the check digit alternates weights one and three across all twelve digits', () => {
  assert.equal(isbn13CheckDigit('978030640615'), '7')
  assert.equal(isbn13CheckDigit('978013235088'), '4')
  assert.equal(isbn13CheckDigit('978140289034'), '5')
  assert.equal(isbn13CheckDigit('97803064061'), null)
})

test('a well-formed isbn-13 validates', () => {
  assert.equal(isValidIsbn13('9780306406157'), true)
  assert.equal(isValidIsbn13('9780306406195'), true)
})

test('a mismatched check digit fails validation', () => {
  assert.equal(isValidIsbn13('9780306406152'), false)
  assert.equal(isValidIsbn13('9780306406150'), false)
})

test('validation tolerates the documented separators', () => {
  assert.equal(isValidIsbn13('978-0-13-235088-4'), true)
  assert.equal(isValidIsbn13('978-1-402-89034-5'), true)
  assert.equal(isValidIsbn13('978 0 306 40615 7'), true)
})
