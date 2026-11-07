import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, format, canonicalize } from '../src/index.js'

test('a canonical string survives a parse and re-format', () => {
  assert.equal(format(parse('MMXXIV')), 'MMXXIV')
  assert.equal(format(parse('XLII')), 'XLII')
})

test('canonicalize normalises a legacy additive inscription', () => {
  assert.equal(canonicalize('VIIII'), 'IX')
  assert.equal(canonicalize('DCCCC'), 'CM')
})

test('canonicalize still rejects what no mode accepts', () => {
  assert.throws(() => canonicalize('IL'))
  assert.throws(() => canonicalize('VV'))
})

test('a repeated non-repeatable symbol is rejected even in lenient mode', () => {
  assert.throws(() => parse('VV', { mode: 'lenient' }))
  assert.throws(() => parse('LL', { mode: 'lenient' }))
})
