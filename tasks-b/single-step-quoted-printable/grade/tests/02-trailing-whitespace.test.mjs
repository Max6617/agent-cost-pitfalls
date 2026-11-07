// Sub-problem 2: a blank at the end of an emitted line is encoded — on every
// line, however the line ends, and the whole trailing run at that.
import test from 'node:test'
import assert from 'node:assert/strict'
import { encode } from '../src/index.js'

test('a blank run before a hard break is encoded in full', () => {
  assert.equal(encode('alpha  \nbeta'), 'alpha=20=20\nbeta')
})

test('a tab at the end of a line is encoded', () => {
  assert.equal(encode('col\t\nnext'), 'col=09\nnext')
  assert.equal(encode('\tx\t \n'), '\tx=09=20\n')
})

test('trailing blanks are encoded even when the input ends with a newline', () => {
  assert.equal(encode('a\nb \n'), 'a\nb=20\n')
})

test('a line that is only blanks encodes every one of them', () => {
  assert.equal(encode('  \n'), '=20=20\n')
})

test('a trailing blank run long enough to wrap stays encoded across the folds', () => {
  const expected =
    'x' + '=20'.repeat(24) + '=\n' +
    '=20'.repeat(25) + '=\n' +
    '=20'.repeat(25) + '=\n' +
    '=20'.repeat(6)
  assert.equal(encode('x' + ' '.repeat(80)), expected)
})
