// Sub-problem 5: what a refused patch reports, and what it leaves behind.
import test from 'node:test'
import assert from 'node:assert/strict'
import { applyPatch } from '../src/index.js'

test('a hunk that matches nowhere is reported with its number, its header line and its lines', () => {
  const file = 'alpha\nbravo\ncharlie\ndelta\n'
  const patch = '--- a\n+++ b\n@@ -1,3 +1,3 @@\n alpha\n-bravo\n+BRAVO\n CHARLIE\n'
  const result = applyPatch(file, patch)
  assert.equal(result.ok, false)
  assert.equal(result.applied, 0)
  assert.equal(result.text, file)
  assert.deepEqual(result.errors, [{
    code: 'no-match',
    hunk: 1,
    line: 3,
    fromStart: 1,
    expected: ['alpha', 'bravo', 'CHARLIE'],
    actual: ['alpha', 'bravo', 'charlie'],
  }])
})

test('a refused hunk in the middle leaves the file untouched and names the hunk', () => {
  const file = 'a1\na2\na3\na4\nb1\nb2\nb3\nb4\nc1\nc2\nc3\nc4\n'
  const patch = '--- a\n+++ b\n@@ -1,2 +1,2 @@\n a1\n-a2\n+A2\n@@ -5,2 +5,2 @@\n b1\n-B2\n+B2!\n@@ -9,2 +9,2 @@\n c1\n-c2\n+C2!\n'
  const result = applyPatch(file, patch)
  assert.equal(result.ok, false)
  assert.equal(result.text, file)
  assert.equal(result.applied, 1)
  assert.deepEqual(result.hunks, [{ index: 1, atLine: 1, offset: 0 }])
  assert.equal(result.errors.length, 1)
  assert.equal(result.errors[0].code, 'no-match')
  assert.equal(result.errors[0].hunk, 2)
  assert.equal(result.errors[0].line, 7)
  assert.deepEqual(result.errors[0].expected, ['b1', 'B2'])
  assert.deepEqual(result.errors[0].actual, ['b1', 'b2'])
})

test('the report reads the file where the header claims, stopping at the last line', () => {
  const truncated = applyPatch('one\ntwo\nthree\n', '--- a\n+++ b\n@@ -2,3 +2,3 @@\n xx\n-yy\n+YY\n zz\n')
  assert.equal(truncated.ok, false)
  assert.deepEqual(truncated.errors[0].expected, ['xx', 'yy', 'zz'])
  assert.deepEqual(truncated.errors[0].actual, ['two', 'three'])

  const past = applyPatch('one\ntwo\n', '--- a\n+++ b\n@@ -9,3 +9,3 @@\n a\n-b\n+c\n d\n')
  assert.equal(past.ok, false)
  assert.equal(past.errors[0].hunk, 1)
  assert.equal(past.errors[0].fromStart, 9)
  assert.deepEqual(past.errors[0].expected, ['a', 'b', 'd'])
  assert.deepEqual(past.errors[0].actual, [])
})

test('a patch that is not well formed is refused with a reason and the line it went wrong on', () => {
  const garbage = applyPatch('a\n', 'hello there\n')
  assert.equal(garbage.ok, false)
  assert.equal(garbage.text, 'a\n')
  assert.deepEqual(garbage.errors, [{ code: 'malformed', line: 1, reason: 'bad-header' }])

  const truncated = applyPatch('a\nb\n', '--- a\n+++ b\n@@ -1,3 +1,3 @@\n a\n b\n')
  assert.deepEqual(truncated.errors, [{ code: 'malformed', line: 3, reason: 'body-mismatch' }])

  const badPrefix = applyPatch('a\nb\n', '--- a\n+++ b\n@@ -1,2 +1,2 @@\n a\n?b\n+B\n')
  assert.deepEqual(badPrefix.errors, [{ code: 'malformed', line: 5, reason: 'bad-prefix' }])

  const strayMarker = applyPatch('a\n', '--- a\n+++ b\n@@ -1 +1 @@\n\\ No newline at end of file\n-a\n+A\n')
  assert.deepEqual(strayMarker.errors, [{ code: 'malformed', line: 4, reason: 'bad-marker' }])
})
