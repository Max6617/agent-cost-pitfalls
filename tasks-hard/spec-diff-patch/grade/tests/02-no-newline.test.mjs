// Sub-problem 2: the `\ No newline at end of file` marker - writing it on the
// side it describes, reading it back, and honouring it when a patch is applied.
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDiff, parsePatch, applyPatch } from '../src/index.js'

const MARKER = '\\ No newline at end of file'
const bodyLines = (patch) => patch.split('\n').filter((line) => line !== '')

test('two files that both end without a newline are marked on both sides', () => {
  const lines = bodyLines(buildDiff('x\ny', 'x\nY'))
  assert.equal(lines.filter((line) => line === MARKER).length, 2)
  assert.equal(lines[lines.indexOf('+Y') + 1], MARKER)
  assert.equal(lines[lines.indexOf('-y') + 1], MARKER)

  const { hunks, error } = parsePatch(lines.join('\n') + '\n')
  assert.equal(error, null)
  assert.deepEqual(hunks[0].noNewline, { from: true, to: true })
})

test('a file that gains a trailing newline marks only the old side', () => {
  const lines = bodyLines(buildDiff('x\ny', 'x\ny\n'))
  assert.equal(lines.filter((line) => line === MARKER).length, 1)
  assert.equal(lines[lines.indexOf('-y') + 1], MARKER)
  assert.notEqual(lines[lines.indexOf('+y') + 1], MARKER)
})

test('a file that loses its trailing newline marks the new side', () => {
  const lines = bodyLines(buildDiff('x\ny\n', 'x\ny'))
  assert.equal(lines.filter((line) => line === MARKER).length, 1)
  assert.equal(lines[lines.indexOf('+y') + 1], MARKER)
})

test('a marked hunk is found again after the file has moved, and its marker survives the apply', () => {
  const patch = '--- a\n+++ b\n@@ -3,2 +3,2 @@\n a\n-b\n+B\n\\ No newline at end of file\n'
  const result = applyPatch('zero\na\nb\n', patch, { maxOffset: 2 })
  assert.equal(result.ok, true)
  assert.equal(result.text, 'zero\na\nB')
  assert.deepEqual(result.hunks, [{ index: 1, atLine: 2, offset: -1 }])
})
