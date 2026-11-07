/**
 * fixture-guard.test.mjs - can we tell whether an arm edited the tests it is graded by?
 *
 * WHY THIS EXISTS. On 2026-10-02, watching the live DeepSeek matrix, one arm was seen editing
 * `test/money.test.js` and `test/summary.test.js` on a task whose prompt was "fix the money
 * handling so the test suite under test/ passes". The tasks/ suite grades with
 *   "test": "node --test"
 * run IN THE WORKDIR, as the agent left it. Nothing restores the fixture's tests first. So an
 * arm that weakens an assertion turns solved:false into solved:true, and the record cannot tell
 * the difference. tasks-hard/ was built against exactly this - its hidden grader is staged from
 * outside the workdir and says so - but batch 1 has no such protection.
 *
 * The record gave no way to know how often it had already happened: runs.jsonl stores no hash of
 * the fixture and no list of modified files. That is the "a number exists and is not on the
 * record" failure this project keeps retracting claims over.
 *
 * This module MEASURES ONLY. It does not restore anything and does not change a score: changing
 * the grading rule mid-study would silently alter the treatment. It reports what changed so the
 * analysis can stratify on it, and so the next suite can be built to prevent it.
 *
 * Run: node --test tools/fixture-guard.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotFixture, diffFixture } from './fixture-guard.mjs'

const root = join(tmpdir(), 'dsh-exp-fixture-guard-test-' + Date.now().toString(36))

let n = 0
function fixture () {
  // A FRESH directory per call. The first version reused join(root, 'wd') for every test, so
  // the earlier tests' edits and deletions leaked into the later ones and the last test failed
  // on leftovers rather than on anything the module did.
  const d = join(root, 'wd-' + (++n))
  mkdirSync(join(d, 'src'), { recursive: true })
  mkdirSync(join(d, 'test'), { recursive: true })
  writeFileSync(join(d, 'src', 'cart.js'), 'export const total = 0\n')
  writeFileSync(join(d, 'test', 'cart.test.js'), "import test from 'node:test'\ntest('x', () => {})\n")
  writeFileSync(join(d, 'package.json'), '{"name":"fixture"}\n')
  return d
}

test('an untouched fixture reports nothing modified', () => {
  const d = fixture()
  const before = snapshotFixture(d)
  const diff = diffFixture(before, d)
  assert.equal(diff.modified.length, 0)
  assert.equal(diff.added.length, 0)
  assert.equal(diff.deleted.length, 0)
  assert.equal(diff.testsTouched.length, 0)
})

test('a src edit is reported as a src edit and NOT as a test edit', () => {
  const d = fixture()
  const before = snapshotFixture(d)
  writeFileSync(join(d, 'src', 'cart.js'), 'export const total = 1\n')
  const diff = diffFixture(before, d)
  assert.deepEqual(diff.modified, ['src/cart.js'])
  assert.deepEqual(diff.testsTouched, [], 'editing src must not be flagged as touching tests')
})

test('editing a test file IS flagged - this is the whole point of the module', () => {
  const d = fixture()
  const before = snapshotFixture(d)
  writeFileSync(join(d, 'test', 'cart.test.js'), "import test from 'node:test'\n// nothing to see here\n")
  const diff = diffFixture(before, d)
  assert.deepEqual(diff.modified, ['test/cart.test.js'])
  assert.deepEqual(diff.testsTouched, ['test/cart.test.js'])
})

test('adding a new test file is flagged (a new test can also rewrite the verdict)', () => {
  const d = fixture()
  const before = snapshotFixture(d)
  writeFileSync(join(d, 'test', 'extra.test.js'), "import test from 'node:test'\ntest('y', () => {})\n")
  const diff = diffFixture(before, d)
  assert.deepEqual(diff.added, ['test/extra.test.js'])
  assert.deepEqual(diff.testsTouched, ['test/extra.test.js'])
})

test('DELETING a test file is flagged - the cheapest way to make a suite pass', () => {
  const d = fixture()
  const before = snapshotFixture(d)
  rmSync(join(d, 'test', 'cart.test.js'))
  const diff = diffFixture(before, d)
  assert.deepEqual(diff.deleted, ['test/cart.test.js'])
  assert.deepEqual(diff.testsTouched, ['test/cart.test.js'])
})

test('a same-size edit is still caught (mtime is not enough on its own)', () => {
  const d = fixture()
  const before = snapshotFixture(d)
  writeFileSync(join(d, 'src', 'cart.js'), 'export const total = 9\n')  // same length
  const diff = diffFixture(before, d)
  assert.deepEqual(diff.modified, ['src/cart.js'], 'content hashing, not size or mtime')
})

test('harness droppings are ignored, so the signal is not buried in noise', () => {
  const d = fixture()
  const before = snapshotFixture(d)
  mkdirSync(join(d, '.cline-config', 'data'), { recursive: true })
  writeFileSync(join(d, '.cline-config', 'data', 'providers.json'), '{}')
  mkdirSync(join(d, '.harness-root'), { recursive: true })
  writeFileSync(join(d, '.harness-root', 'x'), 'x')
  mkdirSync(join(d, 'node_modules', 'pkg'), { recursive: true })
  writeFileSync(join(d, 'node_modules', 'pkg', 'index.js'), 'x')
  const diff = diffFixture(before, d)
  assert.deepEqual(diff.added, [], 'per-run harness state is not part of the fixture diff')
  assert.deepEqual(diff.testsTouched, [])
})

test('the snapshot itself is stable and does not include harness droppings', () => {
  const d = fixture()
  mkdirSync(join(d, '.harness-root'), { recursive: true })
  writeFileSync(join(d, '.harness-root', 'x'), 'x')
  const s = snapshotFixture(d)
  assert.deepEqual(Object.keys(s.files).sort(), ['package.json', 'src/cart.js', 'test/cart.test.js'])
})
