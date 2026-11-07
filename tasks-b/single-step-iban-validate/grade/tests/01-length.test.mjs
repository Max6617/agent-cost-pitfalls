// Sub-problem 1: the country table and the per-country length check.
import test from 'node:test'
import assert from 'node:assert/strict'
import { specFor, hasExpectedLength } from '../src/index.js'

test('the table holds the British length', () => {
  assert.equal(specFor('GB').length, 22)
})

test('a full-length British IBAN passes the length check', () => {
  assert.equal(hasExpectedLength('GB29NWBK60161331926819'), true)
})

test('a British IBAN one character short fails the length check', () => {
  assert.equal(hasExpectedLength('GB29NWBK6016133192681'), false)
})

test('a country outside the table has no spec', () => {
  assert.equal(specFor('XX'), null)
})
