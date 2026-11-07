import test from 'node:test'
import assert from 'node:assert/strict'
import { isbn10CheckDigit, isValidIsbn10, isbn13CheckDigit, isValidIsbn13 } from '../src/index.js'

test('isbn-10 check digit is a weighted sum mod 11', () => {
  assert.equal(isbn10CheckDigit('030640615'), '2')
})

test('a valid isbn-10 validates, hyphens and all', () => {
  assert.equal(isValidIsbn10('0-306-40615-2'), true)
})

test('isbn-13 check digit alternates 1 and 3 across the twelve digits', () => {
  assert.equal(isbn13CheckDigit('978030640615'), '7')
})

test('a valid isbn-13 validates with spaces as separators', () => {
  assert.equal(isValidIsbn13('978 0 306 40615 7'), true)
})
