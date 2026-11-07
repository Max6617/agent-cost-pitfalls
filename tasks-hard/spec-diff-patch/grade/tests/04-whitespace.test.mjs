// Sub-problem 4: tolerant matching - what it compares, what it must not
// compare, and the fact that it only decides where a hunk lands.
import test from 'node:test'
import assert from 'node:assert/strict'
import { applyPatch } from '../src/index.js'

test('trailing whitespace is tolerated only when asked for, and the file keeps its own lines', () => {
  const file = 'one   \ntwo\nthree\n'
  const patch = '--- a\n+++ b\n@@ -1,3 +1,3 @@\n one\n-two\n+TWO\n three\n'

  const strict = applyPatch(file, patch)
  assert.equal(strict.ok, false)
  assert.equal(strict.text, file)
  assert.equal(strict.errors[0].code, 'no-match')

  const loose = applyPatch(file, patch, { ignoreWhitespace: true })
  assert.equal(loose.ok, true)
  assert.equal(loose.text, 'one   \nTWO\nthree\n')
})

test('runs of spaces and tabs compare as a single space', () => {
  const runs = applyPatch(
    'one\na   b\nthree\n',
    '--- a\n+++ b\n@@ -1,3 +1,3 @@\n one\n-a b\n+A B\n three\n',
    { ignoreWhitespace: true },
  )
  assert.equal(runs.ok, true)
  assert.equal(runs.text, 'one\nA B\nthree\n')

  const tab = applyPatch(
    'one\n\tx\nthree\n',
    '--- a\n+++ b\n@@ -1,3 +1,3 @@\n one\n- x\n+ y\n three\n',
    { ignoreWhitespace: true },
  )
  assert.equal(tab.ok, true)
  assert.equal(tab.text, 'one\n y\nthree\n')
})

test('leading whitespace still tells two lines apart', () => {
  const file = 'one\n  x\nthree\n'
  const patch = '--- a\n+++ b\n@@ -1,3 +1,3 @@\n one\n-x\n+X\n three\n'
  const result = applyPatch(file, patch, { ignoreWhitespace: true })
  assert.equal(result.ok, false)
  assert.equal(result.text, file)
  assert.equal(result.errors[0].code, 'no-match')
})

test('a drifted hunk matched through trailing whitespace does not rewrite the lines it landed on', () => {
  const file = 'zero\none\ntwo\nthree\nfour   \nfive\n'
  const patch = '--- a\n+++ b\n@@ -2,3 +2,3 @@\n two  \n-three\n+THREE\n four\n'
  const result = applyPatch(file, patch, { ignoreWhitespace: true, maxOffset: 3 })
  assert.equal(result.ok, true)
  assert.equal(result.text, 'zero\none\ntwo\nTHREE\nfour   \nfive\n')
  assert.deepEqual(result.hunks, [{ index: 1, atLine: 3, offset: 1 }])
})
