// Sub-problem 3: placing a hunk when the file has moved on - the search order,
// the drift limit, and the lower bound left by the hunk before.
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDiff, applyPatch } from '../src/index.js'

const driftPatch = () => buildDiff('zero\none\ntwo\nthree\nfour\nfive\n', 'zero\none\ntwo\nTHREE\nfour\nfive\n', { context: 1 })

test('a hunk that still sits where its header says is placed there with no offset', () => {
  const patch = buildDiff('one\ntwo\nthree\n', 'one\nTWO\nthree\n')
  const result = applyPatch('one\ntwo\nthree\n', patch)
  assert.equal(result.ok, true)
  assert.equal(result.text, 'one\nTWO\nthree\n')
  assert.deepEqual(result.hunks, [{ index: 1, atLine: 1, offset: 0 }])
  assert.deepEqual(result.errors, [])
})

test('a block that has moved is found wherever it went, and the offset says how far', () => {
  const down = applyPatch('pre\nzero\none\ntwo\nthree\nfour\nfive\n', driftPatch(), { maxOffset: 4 })
  assert.equal(down.ok, true)
  assert.equal(down.text, 'pre\nzero\none\ntwo\nTHREE\nfour\nfive\n')
  assert.deepEqual(down.hunks, [{ index: 1, atLine: 4, offset: 1 }])

  const up = applyPatch('two\nthree\nfour\nfive\n', driftPatch(), { maxOffset: 4 })
  assert.equal(up.ok, true)
  assert.equal(up.text, 'two\nTHREE\nfour\nfive\n')
  assert.deepEqual(up.hunks, [{ index: 1, atLine: 1, offset: -2 }])
})

test('the search reaches maxOffset in both directions and no further', () => {
  const movedDown = 'x\ny\nzero\none\ntwo\nthree\nfour\nfive\n'
  const within = applyPatch(movedDown, driftPatch(), { maxOffset: 2 })
  assert.equal(within.ok, true)
  assert.deepEqual(within.hunks, [{ index: 1, atLine: 5, offset: 2 }])

  const beyond = applyPatch(movedDown, driftPatch(), { maxOffset: 1 })
  assert.equal(beyond.ok, false)
  assert.equal(beyond.text, movedDown)
  assert.equal(beyond.applied, 0)
  assert.equal(beyond.errors[0].code, 'no-match')

  const movedUp = applyPatch('two\nthree\nfour\nfive\n', driftPatch(), { maxOffset: 2 })
  assert.equal(movedUp.ok, true)
  assert.deepEqual(movedUp.hunks, [{ index: 1, atLine: 1, offset: -2 }])
  assert.equal(movedUp.text, 'two\nTHREE\nfour\nfive\n')
})

test('the claimed line is tried first, then the earlier candidates, then the later ones', () => {
  const patch = '--- a\n+++ b\n@@ -3 +3 @@\n-xx\n+XX\n'
  const result = applyPatch('aa\nxx\nbb\nxx\ncc\n', patch)
  assert.equal(result.ok, true)
  assert.deepEqual(result.hunks, [{ index: 1, atLine: 2, offset: -1 }])
  assert.equal(result.text, 'aa\nXX\nbb\nxx\ncc\n')
})

test('a hunk covering the last line of the file is found after the file has grown above it', () => {
  const grown = 'zero\none\ntwo\nthree\nfour\nfive\nsix\n'
  const patch = buildDiff(grown, 'zero\none\ntwo\nthree\nfour\nFIVE\nsix\n', { context: 1 })
  const result = applyPatch('one\ntwo\nthree\nfour\nfive\nsix\n', patch, { maxOffset: 3 })
  assert.equal(result.ok, true)
  assert.equal(result.text, 'one\ntwo\nthree\nfour\nFIVE\nsix\n')
  assert.deepEqual(result.hunks, [{ index: 1, atLine: 4, offset: -1 }])
})

test('a hunk may not be placed above the line the hunk before it ended on', () => {
  const file = 'a1\na2\na3\na4\nb1\nb2\n'
  const patch = '--- a\n+++ b\n@@ -1,4 +1,4 @@\n a1\n-a2\n+A2\n a3\n a4\n@@ -2 +2 @@\n-a2\n+A2!\n'
  const result = applyPatch(file, patch, { maxOffset: 4 })
  assert.equal(result.ok, false)
  assert.equal(result.text, file)
  assert.equal(result.errors.length, 1)
})
