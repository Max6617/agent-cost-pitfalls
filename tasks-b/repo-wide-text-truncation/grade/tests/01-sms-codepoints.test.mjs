// Sub-problem 1: the SMS surface counts and cuts in UTF-16 code units instead
// of Unicode code points, so astral characters are weighed double and a cut
// can land between the two halves of a surrogate pair.
import test from 'node:test'
import assert from 'node:assert/strict'
import { smsPreview } from '../src/index.js'

test('a surrogate pair is never split at the cut', () => {
  assert.equal(smsPreview('a'.repeat(158) + '🙂' + 'b'.repeat(20)), 'a'.repeat(158) + '🙂…')
})

test('an astral character counts as one toward the limit', () => {
  const message = 'a'.repeat(158) + '🙂' + 'b'
  assert.equal(smsPreview(message), message)
})

test('a message of only astral characters shortens on code points', () => {
  assert.equal(smsPreview('🙂'.repeat(161)), '🙂'.repeat(159) + '…')
})

test('a boundary further back than the window does not move the cut', () => {
  assert.equal(
    smsPreview('a'.repeat(148) + ' ' + '🙂' + 'b'.repeat(30)),
    'a'.repeat(148) + ' 🙂' + 'b'.repeat(9) + '…',
  )
})
