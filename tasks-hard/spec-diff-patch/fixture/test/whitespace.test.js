import test from 'node:test'
import assert from 'node:assert/strict'
import { applyPatch } from '../src/index.js'

const PATCH = '--- a\n+++ b\n@@ -1,3 +1,3 @@\n one\n-two\n+TWO\n three\n'

test('a hunk is found when the whitespace around its lines differs', () => {
  const result = applyPatch('one   \ntwo\nthree\n', PATCH, { ignoreWhitespace: true })
  assert.equal(result.ok, true)
  assert.equal(result.text, 'one   \nTWO\nthree\n')
})

test('whitespace tolerance is off unless the caller asks for it', () => {
  const result = applyPatch('one\ntwo  \nthree\n', PATCH)
  assert.equal(result.ok, false)
  assert.equal(result.errors[0].code, 'no-match')
})

test('indentation still has to match', () => {
  const result = applyPatch('one\n  x\nthree\n', '--- a\n+++ b\n@@ -1,3 +1,3 @@\n one\n-x\n+X\n three\n', { ignoreWhitespace: true })
  assert.equal(result.ok, false)
})
