// Interaction cases: the convention's rules combine. An astral character
// inside the boundary window, a boundary searched at the policy limit, an
// emoji sitting right next to the cut.
import test from 'node:test'
import assert from 'node:assert/strict'
import { smsPreview, pushPreview, emailSubject, logLine, tableCell } from '../src/index.js'

test('an astral-heavy message still honours a boundary inside the window', () => {
  assert.equal(
    smsPreview('🙂'.repeat(10) + 'a'.repeat(148) + ' ' + 'b'.repeat(30)),
    '🙂'.repeat(10) + 'a'.repeat(148) + '…',
  )
})

test('a title with emoji breaks on the boundary and stays inside the limit', () => {
  assert.equal(pushPreview('p'.repeat(110) + ' ' + '🚀'.repeat(15)), 'p'.repeat(110) + '…')
})

test('a log line keeps an emoji next to the cut without inventing a boundary', () => {
  assert.equal(
    logLine('a'.repeat(55) + ' ' + '🙂' + 'b'.repeat(30)),
    'a'.repeat(55) + ' 🙂' + 'b'.repeat(22) + '…',
  )
})

test('a cell of emoji breaks at the boundary, not mid-word', () => {
  assert.equal(tableCell('🙂'.repeat(20) + ' ' + 'b'.repeat(10)), '🙂'.repeat(20) + '…')
})

test('the boundary is searched at the policy limit, not a shorter one', () => {
  assert.equal(emailSubject('s'.repeat(57) + ' ' + 't'.repeat(4)), 's'.repeat(57) + '…')
})
