// Sub-problem 2: repetition limits. I, X, C and M repeat at most three times;
// V, L and D never repeat. Lenient mode tolerates additive over-runs of the
// repeatable symbols, nothing else.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../src/index.js'

test('strict mode rejects a fourth consecutive repeatable symbol', () => {
  assert.throws(() => parse('IIII', { mode: 'strict' }))
  assert.throws(() => parse('XXXX', { mode: 'strict' }))
  assert.throws(() => parse('CCCC', { mode: 'strict' }))
  assert.throws(() => parse('MMMM', { mode: 'strict' }))
})

test('V, L and D never repeat, in either mode', () => {
  for (const bad of ['VV', 'LL', 'DD']) {
    assert.throws(() => parse(bad, { mode: 'strict' }), bad + ' strict')
    assert.throws(() => parse(bad, { mode: 'lenient' }), bad + ' lenient')
  }
})

test('lenient mode accepts the legacy additive over-runs', () => {
  assert.equal(parse('IIII', { mode: 'lenient' }), 4)
  assert.equal(parse('VIIII', { mode: 'lenient' }), 9)
  assert.equal(parse('LXXXX', { mode: 'lenient' }), 90)
  assert.equal(parse('DCCCC', { mode: 'lenient' }), 900)
})

test('the default mode rejects a fourth repeat', () => {
  assert.throws(() => parse('XXXX'))
  assert.throws(() => parse('VIIII'))
})
