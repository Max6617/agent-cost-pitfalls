// Sub-problem 3: soft line breaks. No emitted line exceeds 76 characters and
// the soft-break '=' counts toward the 76, so content stops at 75 columns.
import test from 'node:test'
import assert from 'node:assert/strict'
import { encode } from '../src/index.js'

test('a 76-character line is folded after 75 columns', () => {
  assert.equal(encode('x'.repeat(76)), 'x'.repeat(75) + '=\nx')
})

test('a long line folds into chunks no longer than 76 characters', () => {
  const s = 'ab'.repeat(100)
  const encoded = encode(s)
  assert.equal(encoded, s.slice(0, 75) + '=\n' + s.slice(75, 150) + '=\n' + s.slice(150))
  for (const line of encoded.split('\n')) assert.ok(line.length <= 76, 'line too long: ' + line.length)
})

test('a folded line resumes up to the next hard break', () => {
  assert.equal(
    encode('y'.repeat(80) + '\n' + 'z'),
    'y'.repeat(75) + '=\n' + 'y'.repeat(5) + '\n' + 'z',
  )
})

test('an escape that would end exactly one column past the limit moves to the next line', () => {
  assert.equal(encode('x'.repeat(73) + 'éz'), 'x'.repeat(73) + '=\n=C3=A9z')
})

test('a blank that lands on the wrap column moves to the next line and is encoded there', () => {
  // 74 a's + blank fills the line; encoding the blank in place would take the
  // line to 77 columns, so the blank travels, encoded, on the next line
  assert.equal(encode('a'.repeat(74) + ' bc'), 'a'.repeat(74) + '=\n=20bc')
})

test('a blank that lands on the wrap column is encoded in place when that still fits', () => {
  // 72 a's + blank: '=20' ends exactly at column 75, so the blank stays
  assert.equal(encode('a'.repeat(72) + ' é'), 'a'.repeat(72) + '=20=\n=C3=A9')
})
