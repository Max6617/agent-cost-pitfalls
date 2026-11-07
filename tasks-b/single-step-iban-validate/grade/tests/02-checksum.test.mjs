// Sub-problem 2: the rearrangement, the letter expansion and the mod-97 residue.
import test from 'node:test'
import assert from 'node:assert/strict'
import { numericForm, mod97, verifyChecksum } from '../src/index.js'

test('the numeric form moves the head to the tail and expands letters', () => {
  assert.equal(numericForm('NL20INGB0001234567'), '182316110001234567232120')
})

test('a German IBAN of known provenance passes the checksum', () => {
  assert.equal(verifyChecksum('DE44500105175407324931'), true)
})

test('a 27-character French IBAN passes the checksum', () => {
  assert.equal(verifyChecksum('FR1420041010050500013M02606'), true)
})

test('a 16-character Belgian IBAN passes the checksum', () => {
  assert.equal(verifyChecksum('BE68539007547034'), true)
})

test('a single corrupted digit is caught', () => {
  assert.equal(verifyChecksum('DE54500105175407324931'), false)
})

test('the residue of a valid Italian IBAN is exactly 1', () => {
  assert.equal(mod97(numericForm('IT60X0542811101000000123456')), 1)
})
