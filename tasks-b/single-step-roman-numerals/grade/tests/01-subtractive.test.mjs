// Sub-problem 1: subtractive-notation validation. Only IV, IX, XL, XC, CD and
// CM are legal pairs, and that holds in every parsing mode.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, format } from '../src/index.js'

test('strict mode accepts each of the six legal pairs', () => {
  assert.equal(parse('IV', { mode: 'strict' }), 4)
  assert.equal(parse('IX', { mode: 'strict' }), 9)
  assert.equal(parse('XL', { mode: 'strict' }), 40)
  assert.equal(parse('XC', { mode: 'strict' }), 90)
  assert.equal(parse('CD', { mode: 'strict' }), 400)
  assert.equal(parse('CM', { mode: 'strict' }), 900)
})

test('strict mode rejects pairs outside the six legal ones', () => {
  for (const bad of ['IL', 'IC', 'XD', 'XM', 'VL', 'DM']) {
    assert.throws(() => parse(bad, { mode: 'strict' }), bad)
  }
})

test('lenient mode rejects illegal subtractive pairs too', () => {
  assert.throws(() => parse('IL', { mode: 'lenient' }))
  assert.throws(() => parse('IC', { mode: 'lenient' }))
  assert.throws(() => parse('XD', { mode: 'lenient' }))
})

test('the default mode rejects illegal subtractive pairs', () => {
  assert.throws(() => parse('IC'))
  assert.throws(() => parse('XM'))
})

test('a single illegal pair rejects the whole numeral, however long', () => {
  assert.throws(() => parse('MIM', { mode: 'strict' }))
  assert.throws(() => parse('MIM', { mode: 'lenient' }))
  assert.equal(parse('MCMXCIX', { mode: 'strict' }), 1999)
})

test('a legal pair survives a strict parse and re-format', () => {
  assert.equal(format(parse('CM', { mode: 'strict' })), 'CM')
  assert.equal(format(parse('CD', { mode: 'strict' })), 'CD')
  assert.equal(format(parse('XC', { mode: 'strict' })), 'XC')
})
