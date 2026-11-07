/**
 * validate-tasks.test.mjs - the validator must not pass a task that has nothing to run.
 *
 * THE DEFECT THIS EXISTS FOR. On 2026-10-03 forty scaffolded tasks - a task.json whose prompt was
 * the string "TODO: the symptom, in the voice of a colleague", an empty fixture/test/, an empty
 * grade/tests/ and an empty reference/ - were reported as "40 tasks, 40 valid, 0 invalid", while
 * the per-task gate (verify-task.mjs) failed every one of them.
 *
 * The cause: BROKEN-BEFORE consulted exactly one thing, a non-zero exit - and a grader that
 * CRASHES exits non-zero too. That is this repo's own rule broken by its own tool: "a non-zero
 * exit is not evidence until its cause is known", and the mirror of "an absent number read as a
 * measurement".
 *
 * The graders here are plain scripts that print test-runner-shaped output and set an exit code,
 * so the test is about the VALIDATOR's logic and not about how node's CLI parses a path.
 *
 * Run: node --test tools/validate-tasks.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const repo = fileURLToPath(new URL('..', import.meta.url))
const suite = join(tmpdir(), 'dsh-exp-validate-test-' + Date.now().toString(36))

/** Three authored cases, all failing: test-runner output, exit 1. */
const FAILING_GRADER = "console.log('not ok 1 - a')\nconsole.log('not ok 2 - b')\nconsole.log('not ok 3 - c')\nconsole.log('# fail 3')\nprocess.exit(1)\n"
/** A grader that cannot even load: exit 1, but nothing ran. */
const CRASHING_GRADER = "import { thing } from './does-not-exist.js'\nconsole.log(thing())\n"
const HIDDEN_CASES = "import test from 'node:test'\nimport assert from 'node:assert/strict'\ntest('a', () => assert.equal(1, 2))\ntest('b', () => assert.equal(2, 3))\ntest('c', () => assert.equal(3, 4))\n"
const VISIBLE_SUITE = "import test from 'node:test'\nimport assert from 'node:assert/strict'\ntest('broken', () => assert.equal(1, 2))\n"

const makeTask = (id, { prompt, visible, hidden, grader }, root = suite) => {
  const d = join(root, id)
  mkdirSync(join(d, 'fixture', 'test'), { recursive: true })
  mkdirSync(join(d, 'grade', 'tests'), { recursive: true })
  writeFileSync(join(d, 'fixture', 'package.json'), JSON.stringify({ name: id, type: 'module' }))
  if (visible) writeFileSync(join(d, 'fixture', 'test', 'visible.test.js'), visible)
  if (hidden) writeFileSync(join(d, 'grade', 'tests', '01-hidden.test.mjs'), hidden)
  const g = join(d, 'grade', 'run.mjs')
  writeFileSync(g, grader)
  // No quotes in the command: the validator runs it through cmd.exe, and quoting is not what is
  // under test here.
  writeFileSync(join(d, 'task.json'), JSON.stringify({ prompt, repo: './fixture', test: 'node ' + g, setup: '' }, null, 1))
  return id
}

/**
 * A grader that FAILS ITS ASSERTIONS and says so - the case the crash detector got wrong.
 *
 * THE DEFECT THIS EXISTS FOR. On 2026-10-04 `edge-json-schema` was reported invalid with
 * "the grader ERRORED rather than failing its assertions". It had not errored. The hidden suite
 * asserted that a broken regex is rejected with SchemaError; the un-fixed fixture throws
 * SyntaxError instead; node prints the assertion failure together with the words
 * 'Received "SyntaxError"' - and the validator's crash detector matched that word inside a
 * legitimate assertion message. The task was fine: its reference passes 24/24.
 *
 * A regex that looks for a crash must not fire on prose. This grader reproduces the exact text
 * node produced, exit code and all.
 */
const ASSERT_MESSAGE_GRADER = "console.log('not ok 1 - pattern searches the string')\n" +
  "console.log('  AssertionError [ERR_ASSERTION]: The error is expected to be an instance of \"SchemaError\". Received \"SyntaxError\"')\n" +
  "console.log('      actual: SyntaxError: Invalid regular expression')\n" +
  "console.log('# fail 1')\n" +
  "process.exit(1)\n"

/** A grader that dies before any test runs: node's module-resolution crash, no test summary. */
const DIES_BEFORE_RUNNING_GRADER = "import { thing } from './does-not-exist-either.js'\nconsole.log(thing())\n"

const assertSuite = join(tmpdir(), 'dsh-exp-validate-assert-' + Date.now().toString(36))
makeTask('dies-before-running-task', {
  prompt: 'A colleague reports the export is empty for some tenants.',
  visible: VISIBLE_SUITE, hidden: HIDDEN_CASES, grader: DIES_BEFORE_RUNNING_GRADER,
}, assertSuite)
makeTask('assert-text-task', {
  prompt: 'A colleague reports that a broken pattern is not rejected the way the spec says.',
  visible: VISIBLE_SUITE, hidden: HIDDEN_CASES, grader: ASSERT_MESSAGE_GRADER,
}, assertSuite)

makeTask('empty-task', { prompt: 'TODO: the symptom, in the voice of a colleague. No file names, no fix.', grader: FAILING_GRADER })
makeTask('crash-task', { prompt: 'A colleague reports the export is empty for some tenants.', visible: VISIBLE_SUITE, hidden: HIDDEN_CASES, grader: CRASHING_GRADER })
makeTask('good-task', { prompt: 'A colleague reports that totals are wrong after a partial refund.', visible: VISIBLE_SUITE, hidden: HIDDEN_CASES, grader: FAILING_GRADER })

const run = () => {
  try { return execFileSync(process.execPath, ['tools/validate-tasks.mjs', '--dir', suite], { cwd: repo, encoding: 'utf8', stdio: 'pipe' }) }
  catch (e) { return String(e.stdout ?? '') + String(e.stderr ?? '') }
}
const verdict = (out, id) => {
  const line = out.split('\n').find((l) => new RegExp('(PASS|FAIL)\\s+' + id + '\\b').test(l))
  return line ? (line.trim().startsWith('PASS') ? 'PASS' : 'FAIL') : 'ABSENT'
}

test('a scaffolded task with a TODO prompt and an empty hidden suite is NOT valid', () => {
  const out = run()
  assert.equal(verdict(out, 'empty-task'), 'FAIL', 'empty-task verdict was ' + verdict(out, 'empty-task') + ':\n' + out)
})

test('a task whose grader CRASHES is NOT valid - a crash is not a failing suite', () => {
  const out = run()
  assert.equal(verdict(out, 'crash-task'), 'FAIL', 'crash-task verdict was ' + verdict(out, 'crash-task') + ':\n' + out)
})

test('an assertion message that MENTIONS SyntaxError is a failing suite, not a crash', () => {
  let out
  try { out = execFileSync(process.execPath, ['tools/validate-tasks.mjs', '--dir', assertSuite], { cwd: repo, encoding: 'utf8', stdio: 'pipe' }) }
  catch (e) { out = String(e.stdout ?? '') + String(e.stderr ?? '') }
  assert.equal(verdict(out, 'assert-text-task'), 'PASS',
    'a grader that failed its assertions was read as a crash:\n' + out)
})

test('a grader that dies before any test runs IS a crash, not a failing suite', () => {
  let out
  try { out = execFileSync(process.execPath, ['tools/validate-tasks.mjs', '--dir', assertSuite], { cwd: repo, encoding: 'utf8', stdio: 'pipe' }) }
  catch (e) { out = String(e.stdout ?? '') + String(e.stderr ?? '') }
  assert.equal(verdict(out, 'dies-before-running-task'), 'FAIL',
    'a grader that never ran a test was accepted as broken-before:\n' + out)
})

test('a task with a visible failing suite and a real hidden suite IS valid', () => {
  const out = run()
  assert.equal(verdict(out, 'good-task'), 'PASS', 'good-task verdict was ' + verdict(out, 'good-task') + ':\n' + out)
})
