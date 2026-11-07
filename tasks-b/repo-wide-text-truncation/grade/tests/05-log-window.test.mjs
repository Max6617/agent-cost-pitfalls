// Sub-problem 5: the log surface searches the whole kept prefix for a word
// boundary instead of only the last ten code points, so a distant space
// steals the cut.
import test from 'node:test'
import assert from 'node:assert/strict'
import { logLine } from '../src/index.js'

test('a boundary further than ten code points back is ignored', () => {
  assert.equal(
    logLine('a'.repeat(62) + ' ' + 'b'.repeat(30)),
    'a'.repeat(62) + ' ' + 'b'.repeat(16) + '…',
  )
})

test('a boundary inside the last ten code points is honoured', () => {
  assert.equal(logLine('a'.repeat(70) + ' ' + 'b'.repeat(20)), 'a'.repeat(70) + '…')
})

test('only the window decides, even when several boundaries exist', () => {
  assert.equal(
    logLine('a'.repeat(30) + ' ' + 'b'.repeat(36) + ' ' + 'c'.repeat(20)),
    'a'.repeat(30) + ' ' + 'b'.repeat(36) + ' ' + 'c'.repeat(11) + '…',
  )
})

test('a boundary eleven code points back is just outside', () => {
  assert.equal(
    logLine('a'.repeat(68) + ' ' + 'b'.repeat(20)),
    'a'.repeat(68) + ' ' + 'b'.repeat(10) + '…',
  )
})
