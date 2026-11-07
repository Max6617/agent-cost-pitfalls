// Sub-problem 3: generating an IBAN from a BBAN, check digits included.
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildIban, isValid } from '../src/index.js'

test('a check value below ten is written as two digits', () => {
  assert.equal(buildIban('DE', '500105175407324936'), 'DE06500105175407324936')
})

test('a French BBAN with a letter in it builds', () => {
  assert.equal(buildIban('FR', '20041010050500013M02606'), 'FR1420041010050500013M02606')
})

test('the country and the BBAN are normalised before building', () => {
  assert.equal(buildIban('nl', ' ingb 0001 2345 67 '), 'NL20INGB0001234567')
})

test('a built IBAN round-trips through validation', () => {
  assert.equal(isValid(buildIban('CH', '00762011623852957')), true)
})
