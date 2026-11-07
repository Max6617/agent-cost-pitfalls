// Sub-problem 1: the hunk model - how a range is written, how the body is
// aligned, and where one hunk ends and the next begins.
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDiff, parsePatch, applyPatch, formatRange, formatHunkHeader } from '../src/index.js'

test('a range carries its count, except when the count is one', () => {
  assert.equal(formatRange(3, 5), '3,5')
  assert.equal(formatRange(4, 2), '4,2')
  assert.equal(formatRange(1, 1), '1')
  assert.equal(formatRange(7, 1), '7')
  assert.equal(formatRange(0, 0), '0,0')
  assert.equal(formatRange(2, 0), '2,0')
  assert.equal(formatHunkHeader({ fromStart: 1, fromCount: 1, toStart: 3, toCount: 4 }), '@@ -1 +3,4 @@')
  assert.equal(formatHunkHeader({ fromStart: 0, fromCount: 0, toStart: 1, toCount: 2 }), '@@ -0,0 +1,2 @@')
  assert.equal(formatHunkHeader({ fromStart: 9, fromCount: 4, toStart: 9, toCount: 0 }), '@@ -9,4 +9,0 @@')
})

test('a replaced line is written as its addition and then its removal, with the context clipped to the file', () => {
  const patch = buildDiff('A\nB\nC\nD\nE\nF\n', 'A\nbb\nC\nD\nE\nF\n')
  assert.equal(patch, '--- a\n+++ b\n@@ -1,5 +1,5 @@\n A\n+bb\n-B\n C\n D\n E\n')
  // the same build twice is the same text
  assert.equal(buildDiff('A\nB\nC\nD\nE\nF\n', 'A\nbb\nC\nD\nE\nF\n'), patch)

  const { hunks, error } = parsePatch(patch)
  assert.equal(error, null)
  assert.equal(hunks.length, 1)
  assert.equal(hunks[0].fromStart, 1)
  assert.equal(hunks[0].fromCount, 5)
  assert.equal(hunks[0].toStart, 1)
  assert.equal(hunks[0].toCount, 5)
  assert.equal(hunks[0].headerLine, 3)
  assert.deepEqual(hunks[0].noNewline, { from: false, to: false })
  assert.deepEqual(hunks[0].lines.map((line) => line.kind), ['context', 'add', 'remove', 'context', 'context', 'context'])
})

test('changes two times the context apart share a hunk, one line further apart they do not', () => {
  const gapFour = 'A\nB\nm0\nm1\nm2\nm3\nY\nZ\n'
  const gapFourTo = 'A\nBB\nm0\nm1\nm2\nm3\nYY\nZ\n'
  const gapFive = 'A\nB\nm0\nm1\nm2\nm3\nm4\nY\nZ\n'
  const gapFiveTo = 'A\nBB\nm0\nm1\nm2\nm3\nm4\nYY\nZ\n'

  const merged = parsePatch(buildDiff(gapFour, gapFourTo, { context: 2 })).hunks
  assert.equal(merged.length, 1)
  assert.equal(formatHunkHeader(merged[0]), '@@ -1,8 +1,8 @@')

  const split = parsePatch(buildDiff(gapFive, gapFiveTo, { context: 2 })).hunks
  assert.equal(split.length, 2)
  assert.deepEqual(split.map((hunk) => formatHunkHeader(hunk)), ['@@ -1,4 +1,4 @@', '@@ -6,4 +6,4 @@'])
})

test('a patch built for a pair with a repeated block reparses to the documented script and applies back', () => {
  const from = 'alpha\nbravo\ncharlie\nalpha\nbravo\ndelta\n'
  const to = 'alpha\nbravo\nalpha\nBRAVO\ncharlie\ndelta\n'
  const patch = buildDiff(from, to)

  const { hunks, error } = parsePatch(patch)
  assert.equal(error, null)
  assert.deepEqual(
    hunks.flatMap((hunk) => hunk.lines.map((line) => line.kind + ' ' + line.text)),
    ['context alpha', 'context bravo', 'add alpha', 'add BRAVO', 'context charlie', 'remove alpha', 'remove bravo', 'context delta'],
  )

  const applied = applyPatch(from, patch)
  assert.equal(applied.ok, true)
  assert.equal(applied.text, to)
})
