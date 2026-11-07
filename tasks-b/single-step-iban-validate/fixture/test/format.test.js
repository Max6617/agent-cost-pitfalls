import test from 'node:test'
import assert from 'node:assert/strict'
import { toElectronic, toPrintable } from '../src/index.js'

test('the printable form is groups of four', () => {
  assert.equal(toPrintable('DE44500105175407324931'), 'DE44 5001 0517 5407 3249 31')
})

test('the electronic form strips spacing and raises case', () => {
  assert.equal(toElectronic('nl91 abna 0417 1643 00'), 'NL91ABNA0417164300')
})
