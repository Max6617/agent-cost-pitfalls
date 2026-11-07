import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDiff, parsePatch, applyPatch } from '../src/index.js'

const MARKER = '\\ No newline at end of file'
const body = (patch) => patch.split('\n').filter((line) => line !== '')

test('a file whose last line has no newline says so', () => {
  const lines = body(buildDiff('x\ny', 'x\nY'))
  assert.equal(lines[lines.indexOf('-y') + 1], MARKER)
})

test('the marker follows the side it describes', () => {
  const lines = body(buildDiff('x\ny\n', 'x\ny'))
  assert.equal(lines[lines.indexOf('+y') + 1], MARKER)
})

test('a patch carrying the marker parses and applies back to the file it came from', () => {
  const to = 'x\ny'
  const patch = buildDiff('x\ny\n', to)
  assert.deepEqual(parsePatch(patch).hunks[0].noNewline, { from: false, to: true })
  const result = applyPatch('x\ny\n', patch)
  assert.equal(result.ok, true)
  assert.equal(result.text, to)
})
