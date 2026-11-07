// Sub-problem 5: end-to-end validation - normalisation first, reasons in order.
import test from 'node:test'
import assert from 'node:assert/strict'
import { isValid, validate } from '../src/index.js'

test('a valid IBAN reports its canonical form and country', () => {
  assert.deepEqual(validate('DE44500105175407324931'), {
    ok: true, iban: 'DE44500105175407324931', country: 'DE',
  })
})

test('a lowercase printable IBAN validates', () => {
  assert.equal(isValid('de44 5001 0517 5407 3249 31'), true)
})

test('a short British IBAN is bad-length, whatever its digits are', () => {
  assert.equal(validate('GB29NWBK6016133192681').reason, 'bad-length')
})

test('mixed case and stray tabs or newlines are insignificant', () => {
  assert.equal(isValid('\tFr14 2004 1010\n0505 0001 3M02 606 '), true)
})
