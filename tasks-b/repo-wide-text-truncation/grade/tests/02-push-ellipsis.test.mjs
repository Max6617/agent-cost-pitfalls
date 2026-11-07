// Sub-problem 2: the push surface marks the cut with three full stops and
// counts them outside the limit, so a "120-code-point" title can run to 123.
import test from 'node:test'
import assert from 'node:assert/strict'
import { pushPreview } from '../src/index.js'

test('the cut marker is the single-character ellipsis', () => {
  assert.equal(pushPreview('a'.repeat(125)), 'a'.repeat(119) + '…')
})

test('the ellipsis is counted inside the limit', () => {
  assert.equal(pushPreview('x '.repeat(62)), 'x '.repeat(58) + 'x' + '…')
})

test('a title at exactly the limit is sent whole', () => {
  const title = 'a'.repeat(120)
  assert.equal(pushPreview(title), title)
})

test('astral characters are safe in a shortened title', () => {
  assert.equal(pushPreview('🚀'.repeat(125)), '🚀'.repeat(119) + '…')
})
