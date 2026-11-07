// Sub-problem 4: the admin grid cuts every cell mid-word at the column edge
// and never applies the word-boundary rule.
import test from 'node:test'
import assert from 'node:assert/strict'
import { tableCell } from '../src/index.js'

test('a cell breaks at the last space before the cut', () => {
  assert.equal(tableCell('lorem ipsum dolor sit amet'), 'lorem ipsum dolor sit…')
})

test('with no boundary inside the window a cell breaks mid-word', () => {
  assert.equal(tableCell('a'.repeat(25)), 'a'.repeat(23) + '…')
})

test('a boundary exactly ten code points before the cut still counts', () => {
  assert.equal(tableCell('x'.repeat(13) + ' ' + 'y'.repeat(9) + 'z'.repeat(5)), 'x'.repeat(13) + '…')
})

test('the last boundary inside the window wins', () => {
  assert.equal(
    tableCell('x'.repeat(12) + ' ' + 'y'.repeat(8) + ' ' + 'z'.repeat(10)),
    'x'.repeat(12) + ' ' + 'y'.repeat(8) + '…',
  )
})
