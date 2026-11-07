// Sub-problem 2: notation — plain fractions, bare integers, mixed numbers (§3).
import test from 'node:test'
import assert from 'node:assert/strict'
import { fromString, toString } from '../src/index.js'

test('plain fractions parse and reduce as written', () => {
  const f = fromString('3/4')
  assert.equal(f.n, 3)
  assert.equal(f.d, 4)
  assert.equal(toString(fromString('12/8')), '3/2')
  assert.equal(toString(fromString('-9/6')), '-3/2')
  assert.equal(toString(fromString('-0/5')), '0')
})

test('bare integers and improper fractions parse', () => {
  assert.equal(toString(fromString('7')), '7')
  assert.equal(toString(fromString('28/4')), '7')
  assert.equal(toString(fromString('-26/4')), '-13/2')
})

test('a mixed number is the whole part plus the fraction, sign over everything', () => {
  assert.equal(toString(fromString('1 1/2')), '3/2')
  assert.equal(toString(fromString('-1 1/2')), '-3/2')
  assert.equal(toString(fromString('-2 3/4')), '-11/4')
  assert.equal(toString(fromString('0 3/4')), '3/4')
})

test('spacing is free around the slash and the ends', () => {
  assert.equal(toString(fromString('3 / 4')), '3/4')
  assert.equal(toString(fromString('  1 1/2  ')), '3/2')
  assert.equal(toString(fromString('2  1/3')), '7/3')
  assert.equal(toString(fromString('10 / 4')), '5/2')
})
