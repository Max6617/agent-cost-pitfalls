import test from 'node:test'
import assert from 'node:assert/strict'
import { fromString, toString } from '../src/index.js'

test('parses plain fractions and mixed numbers', () => {
  const f = fromString('3/4')
  assert.equal(f.n, 3)
  assert.equal(f.d, 4)
  assert.equal(toString(fromString('1 1/2')), '3/2')
})

test('a negative mixed number negates the whole value', () => {
  assert.equal(toString(fromString('-1 1/2')), '-3/2')
})
