import test from 'node:test'
import assert from 'node:assert/strict'
import { isValid, validate } from '../src/index.js'

test('a lowercase printable IBAN validates', () => {
  assert.equal(isValid('nl91 abna 0417 1643 00'), true)
})

test('a British IBAN one character short reports bad-length', () => {
  assert.equal(validate('GB29NWBK6016133192681').reason, 'bad-length')
})
