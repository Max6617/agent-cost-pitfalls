import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDiff, parsePatch, formatRange, formatHunkHeader } from '../src/index.js'

test('a header writes the count the format asks for', () => {
  assert.equal(formatRange(3, 5), '3,5')
  assert.equal(formatRange(1, 1), '1')
  assert.equal(formatRange(0, 0), '0,0')
  assert.equal(formatHunkHeader({ fromStart: 1, fromCount: 1, toStart: 3, toCount: 4 }), '@@ -1 +3,4 @@')
})

test('one changed line in the middle of a file', () => {
  const patch = buildDiff(
    'alpha\nbravo\ncharlie\ndelta\n',
    'alpha\nBRAVO\ncharlie\ndelta\n',
  )
  assert.equal(patch, '--- a\n+++ b\n@@ -1,4 +1,4 @@\n alpha\n+BRAVO\n-bravo\n charlie\n delta\n')
})

test('two changes four unchanged lines apart are one hunk, five lines apart are two', () => {
  const apart = (gap) => {
    const lines = ['A', 'B']
    for (let i = 0; i < gap; i++) lines.push('m' + i)
    lines.push('Y', 'Z')
    return lines.join('\n') + '\n'
  }
  const changed = (text) => text.replace('\nB\n', '\nBB\n').replace('\nY\n', '\nYY\n')
  assert.equal(parsePatch(buildDiff(apart(4), changed(apart(4)), { context: 2 })).hunks.length, 1)
  assert.equal(parsePatch(buildDiff(apart(5), changed(apart(5)), { context: 2 })).hunks.length, 2)
})

test('two identical versions produce no patch at all', () => {
  assert.equal(buildDiff('one\ntwo\n', 'one\ntwo\n'), '')
})
