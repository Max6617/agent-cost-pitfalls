// Sub-problem 4: printable <-> electronic conversion, short final group included.
import test from 'node:test'
import assert from 'node:assert/strict'
import { toElectronic, toPrintable, isValid } from '../src/index.js'

test('a 22-character IBAN prints as five groups of four and one of two', () => {
  assert.equal(toPrintable('DE44500105175407324931'), 'DE44 5001 0517 5407 3249 31')
})

test('lowercase input is normalised before grouping', () => {
  assert.equal(toPrintable('it60x0542811101000000123456'), 'IT60 X054 2811 1010 0000 0123 456')
})

test('a 16-character IBAN prints as exactly four groups', () => {
  assert.equal(toPrintable('BE68539007547034'), 'BE68 5390 0754 7034')
})

test('the printed form converts back to a valid IBAN', () => {
  assert.equal(isValid(toElectronic(toPrintable('FR1420041010050500013M02606'))), true)
})
