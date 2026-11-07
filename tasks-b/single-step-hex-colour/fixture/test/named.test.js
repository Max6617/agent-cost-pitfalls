import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, toHex } from '../src/index.js'

test('names resolve case-insensitively against the documented table', () => {
  assert.equal(toHex(parse('RebeccaPurple')), '#663399')
  assert.equal(toHex(parse('green')), '#008000')
})

test('text that is not a colour is refused', () => {
  assert.equal(parse(''), null)
  assert.equal(parse('blurple'), null)
  assert.equal(parse('#12345'), null)
})
