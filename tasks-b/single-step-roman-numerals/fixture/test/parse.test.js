import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../src/index.js'

test('parses an ordinary canonical numeral', () => {
  assert.equal(parse('XLII'), 42)
  assert.equal(parse('MMXXIV'), 2024)
})

test('an over-long run is rejected unless lenient mode is requested', () => {
  assert.throws(() => parse('IIII'))
  assert.equal(parse('IIII', { mode: 'lenient' }), 4)
})

test('an illegal subtractive pair is rejected in strict mode', () => {
  assert.throws(() => parse('IL', { mode: 'strict' }))
  assert.throws(() => parse('XM', { mode: 'strict' }))
})
