// Sub-problem 4: parsing modes and the range. The default mode is strict,
// unknown modes throw, and the 1..3999 range binds parsed totals as well as
// formatted values.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../src/index.js'

test('the default parsing mode is strict', () => {
  assert.throws(() => parse('IIII'))
  assert.throws(() => parse('VIIII'))
  assert.equal(parse('XLII'), 42)
})

test('an unrecognised mode is rejected', () => {
  assert.throws(() => parse('IV', { mode: 'loose' }))
  assert.throws(() => parse('IV', { mode: 42 }))
})

test('the range binds parsed totals as well as formatted values', () => {
  assert.throws(() => parse('', { mode: 'lenient' }))
  assert.throws(() => parse('MMMM', { mode: 'lenient' }))
  assert.throws(() => parse('MMMM', { mode: 'strict' }))
})

test('anything but uppercase numeral symbols is rejected in either mode', () => {
  assert.throws(() => parse('xlii', { mode: 'strict' }))
  assert.throws(() => parse('xlii', { mode: 'lenient' }))
  assert.throws(() => parse(' XLII', { mode: 'lenient' }))
})

test('the floor and the ceiling parse in the default mode', () => {
  assert.equal(parse('I'), 1)
  assert.equal(parse('MMMCMXCIX'), 3999)
})
