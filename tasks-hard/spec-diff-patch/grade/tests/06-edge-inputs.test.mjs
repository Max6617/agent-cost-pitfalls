// Sub-problem 6: the edges - no hunks at all, an empty file, and a CRLF file
// next to its LF twin.
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDiff, applyPatch, parsePatch, splitLines, joinLines } from '../src/index.js'

test('a patch with nothing in it is the identity', () => {
  const file = 'one\ntwo\n'
  assert.deepEqual(applyPatch(file, ''), { ok: true, text: file, applied: 0, hunks: [], errors: [] })
  assert.deepEqual(applyPatch(file, '--- a\n+++ b\n'), { ok: true, text: file, applied: 0, hunks: [], errors: [] })
  assert.deepEqual(applyPatch('', ''), { ok: true, text: '', applied: 0, hunks: [], errors: [] })
  assert.equal(buildDiff(file, file), '')
  assert.equal(applyPatch(file, buildDiff(file, file)).text, file)
})

test('lines and files: the empty text, the trailing newline and the empty line', () => {
  assert.deepEqual(splitLines(''), { lines: [], finalNewline: false })
  assert.deepEqual(splitLines('a'), { lines: ['a'], finalNewline: false })
  assert.deepEqual(splitLines('a\n'), { lines: ['a'], finalNewline: true })
  assert.deepEqual(splitLines('a\n\n'), { lines: ['a', ''], finalNewline: true })
  assert.deepEqual(splitLines('\n'), { lines: [''], finalNewline: true })
  assert.equal(joinLines([], true), '')
  assert.equal(joinLines(['a'], false), 'a')
  assert.equal(joinLines(['a'], true), 'a\n')
  assert.equal(joinLines(['a', ''], true), 'a\n\n')

  const toEmpty = buildDiff('one\n', '')
  const toEmptyHunk = parsePatch(toEmpty).hunks[0]
  assert.equal(toEmptyHunk.fromStart, 1)
  assert.equal(toEmptyHunk.toCount, 0)
  assert.equal(applyPatch('one\n', toEmpty).text, '')

  const fromEmpty = buildDiff('', 'one\n')
  const fromEmptyHunk = parsePatch(fromEmpty).hunks[0]
  assert.equal(fromEmptyHunk.fromStart, 0)
  assert.equal(fromEmptyHunk.fromCount, 0)
  assert.equal(applyPatch('', fromEmpty).text, 'one\n')
})

test('a CRLF file and its LF twin differ on every line, and the patch turns one into the other', () => {
  assert.deepEqual(splitLines('a\r\nb\r\n'), { lines: ['a\r', 'b\r'], finalNewline: true })

  const crlf = 'a\r\nb\r\n'
  const lf = 'a\nb\n'
  const { hunks, error } = parsePatch(buildDiff(crlf, lf))
  assert.equal(error, null)
  assert.equal(hunks.length, 1)
  assert.deepEqual(hunks[0].lines.map((line) => line.kind).sort(), ['add', 'add', 'remove', 'remove'])
  assert.deepEqual(hunks[0].lines.map((line) => line.text).sort(), ['a', 'a\r', 'b', 'b\r'])

  const forward = applyPatch(crlf, buildDiff(crlf, lf))
  assert.equal(forward.ok, true)
  assert.equal(forward.text, lf)

  const back = applyPatch(lf, buildDiff(lf, crlf))
  assert.equal(back.ok, true)
  assert.equal(back.text, crlf)
})
