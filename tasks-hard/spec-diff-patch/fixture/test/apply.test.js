import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDiff, applyPatch } from '../src/index.js'

test('a patch applies to the file it was built from', () => {
  const from = 'one\ntwo\nthree\n'
  const to = 'one\nTWO\nthree\n'
  const result = applyPatch(from, buildDiff(from, to))
  assert.equal(result.ok, true)
  assert.equal(result.text, to)
  assert.deepEqual(result.hunks, [{ index: 1, atLine: 1, offset: 0 }])
})

test('a file that has grown since the patch was written still applies', () => {
  const patch = buildDiff('zero\none\ntwo\n', 'zero\none\nTWO\n', { context: 1 })
  const result = applyPatch('header\nzero\none\ntwo\n', patch, { maxOffset: 3 })
  assert.equal(result.ok, true)
  assert.equal(result.text, 'header\nzero\none\nTWO\n')
  assert.equal(result.hunks[0].offset, 1)
})

test('an empty patch changes nothing', () => {
  const result = applyPatch('one\ntwo\n', '')
  assert.deepEqual(result, { ok: true, text: 'one\ntwo\n', applied: 0, hunks: [], errors: [] })
})

test('a patch that does not fit reports the hunk it could not place', () => {
  const result = applyPatch('alpha\nbravo\ncharlie\n', '--- a\n+++ b\n@@ -1,3 +1,3 @@\n alpha\n-nothing\n+something\n charlie\n')
  assert.equal(result.ok, false)
  assert.equal(result.text, 'alpha\nbravo\ncharlie\n')
  assert.equal(result.errors.length, 1)
  assert.equal(result.errors[0].code, 'no-match')
  assert.equal(result.errors[0].hunk, 1)
})
