import test from 'node:test'
import assert from 'node:assert/strict'
import { specFor, hasExpectedLength } from '../src/index.js'

test('a British IBAN is 22 characters', () => {
  assert.equal(specFor('GB').length, 22)
})

test('a correct-length German IBAN passes the length check', () => {
  assert.equal(hasExpectedLength('DE44500105175407324931'), true)
})
