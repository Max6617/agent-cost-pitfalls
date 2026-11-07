import test from 'node:test'
import assert from 'node:assert/strict'
import { buildIban } from '../src/index.js'

test('building a German IBAN computes the check digits', () => {
  assert.equal(buildIban('DE', '500105175407324936'), 'DE06500105175407324936')
})

test('an unknown country builds nothing', () => {
  assert.equal(buildIban('XX', '500105175407324936'), null)
})
