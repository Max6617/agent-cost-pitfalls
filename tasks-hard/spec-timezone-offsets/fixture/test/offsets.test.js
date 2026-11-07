import test from 'node:test'
import assert from 'node:assert/strict'
import { offsetAt } from '../src/index.js'

test('the offset changes on the published date', () => {
  assert.equal(offsetAt('America/New_York', Date.parse('2024-03-09T12:00:00Z')), -300)
  assert.equal(offsetAt('America/New_York', Date.parse('2024-03-11T12:00:00Z')), -240)
  assert.equal(offsetAt('Europe/Berlin', Date.parse('2024-10-28T12:00:00Z')), 60)
})

test('the offset changes at the published instant', () => {
  assert.equal(offsetAt('America/New_York', Date.parse('2024-03-10T07:00:00Z')), -240)
})

test('a fixed zone never moves', () => {
  assert.equal(offsetAt('Asia/Kolkata', Date.parse('2024-01-01T00:00:00Z')), 330)
  assert.equal(offsetAt('Asia/Kolkata', Date.parse('2024-07-01T00:00:00Z')), 330)
})
