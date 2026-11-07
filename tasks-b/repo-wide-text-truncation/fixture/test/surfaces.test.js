import test from 'node:test'
import assert from 'node:assert/strict'
import { smsPreview, pushPreview, emailSubject, logLine, tableCell } from '../src/index.js'

test('sms: an emoji-heavy message shortens without garbling', () => {
  assert.equal(smsPreview('🙂'.repeat(200)), '🙂'.repeat(159) + '…')
})

test('sms: a plain over-long message shortens to the limit', () => {
  assert.equal(smsPreview('x'.repeat(200)), 'x'.repeat(159) + '…')
})

test('push: a long title stays inside the limit', () => {
  assert.equal(pushPreview('a'.repeat(130)), 'a'.repeat(119) + '…')
})

test('push: the word-boundary rule applies to titles', () => {
  assert.equal(pushPreview('ab '.repeat(45)), 'ab '.repeat(38) + 'ab' + '…')
})

test('email: a subject under the agreed limit is sent unchanged', () => {
  assert.equal(emailSubject('s'.repeat(55)), 's'.repeat(55))
})

test('admin grid: a cell breaks at a word boundary near the cut', () => {
  assert.equal(tableCell('alpha beta gamma delta epsilon'), 'alpha beta gamma delta…')
})

test('log: a line breaks mid-word when no boundary is near the cut', () => {
  assert.equal(
    logLine('a'.repeat(60) + ' ' + 'b'.repeat(30)),
    'a'.repeat(60) + ' ' + 'b'.repeat(18) + '…',
  )
})
