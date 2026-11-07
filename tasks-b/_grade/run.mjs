#!/usr/bin/env node
/**
 * _grade/run.mjs — the shared hidden grader for the tasks-b batch.
 *
 *   node <repo>/tasks-b/_grade/run.mjs <task-id>
 *
 * It is invoked by task.json's "test" field, with the agent's workdir (a temp
 * copy of the task's fixture/) as the current directory. The hidden suite lives
 * OUTSIDE that workdir, so the agent can neither read it nor weaken it: deleting
 * test/ in the fixture does not move the score by a single case.
 *
 * Sequence:
 *   1. wipe <workdir>/.grade and copy tasks-b/<id>/grade/tests/*.test.mjs in
 *   2. run `node --test` on exactly those files, printing the normal spec report
 *   3. print one machine-readable TASKSCORE line
 *
 * The denominator is the number of authored `test(` cases in the source, NOT the
 * number node reports: a solution that breaks an import takes a whole file down,
 * and node then counts that file as a single failure. Scoring against the
 * authored count keeps the fraction comparable across arms and punishes the
 * breakage instead of shrinking the denominator to hide it.
 *
 * Exit code is 0 only when every authored case passed, so run-experiment's
 * existing "solved" flag keeps meaning "100%".
 */
import { readdirSync, readFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { safeClean } from '../../tools/safe-fs.mjs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const batchRoot = resolve(here, '..')
const id = process.argv[2]
const workdir = process.argv[3] ? resolve(process.argv[3]) : process.cwd()

function bail(msg, code = 2) {
  console.log('TASKSCORE ' + JSON.stringify({ task: id ?? null, error: msg, pass: 0, fail: 0, authored: 0, score: 0 }))
  console.error('GRADER ERROR: ' + msg)
  process.exit(code)
}

if (!id) bail('no task id given (usage: node _grade/run.mjs <task-id>)')
const testsSrc = join(batchRoot, id, 'grade', 'tests')
if (!existsSync(testsSrc)) {
  bail('GRADER MISSING at ' + testsSrc + ' - if the repository moved, run: node tasks-b/_tools/retarget.mjs')
}
if (!existsSync(workdir)) bail('workdir does not exist: ' + workdir)

const files = readdirSync(testsSrc).filter((f) => f.endsWith('.test.mjs')).sort()
if (!files.length) bail('no *.test.mjs in ' + testsSrc)

// Count the cases as authored. Every case is a top-level `test(` at column 0;
// the suite style is enforced by _tools/verify-task.mjs.
let authored = 0
for (const f of files) {
  const src = readFileSync(join(testsSrc, f), 'utf8')
  authored += (src.match(/^test\(/gm) ?? []).length
}
if (!authored) bail('authored case count is zero in ' + testsSrc)

// 1. stage a pristine copy of the suite inside the workdir, so `../src/x.js`
//    resolves to the agent's code.
// A FRESH staging directory, so there is nothing to wipe.
//
// The original was `rmSync(workdir/.grade)` with workdir taken from argv. That is a
// destructive call on an argument-derived path - the exact shape that deleted results/ - and
// it is unnecessary: a unique name per invocation means the directory is always clean, and
// the agent's own workdir is the only thing that accumulates.
const destName = '.grade-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const dest = join(workdir, destName)
mkdirSync(dest, { recursive: true })
const staged = []
for (const f of files) {
  copyFileSync(join(testsSrc, f), join(dest, f))
  staged.push(join(destName, f))
}

// 2. run it. --test-reporter=spec is the default; naming it keeps the summary
//    stable across node versions.
const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', ...staged], {
  cwd: workdir,
  encoding: 'utf8',
  env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  timeout: 300000,
})
const out = (r.stdout ?? '') + (r.stderr ?? '')
process.stdout.write(out)

const num = (re) => { const m = out.match(re); return m ? Number(m[1]) : 0 }
// Tolerate the reporter's leading glyph (node prints U+2139) and any padding.
const pass = num(/(?:^|\n)[^\w\n]*pass (\d+)/)
const fail = num(/(?:^|\n)[^\w\n]*fail (\d+)/)
const reported = pass + fail

let note = ''
if (r.error) note = 'runner error: ' + r.error.message
else if (r.status === null) note = 'runner timed out or was killed'
else if (reported === 0) note = 'no test results parsed - the suite may not have loaded at all'
else if (reported < authored) note = (authored - reported) + ' case(s) never reported (a test file most likely failed to load)'

const score = pass / authored
// Which cases failed, so a near-miss can be read without the full report: the
// difference between 23/25 and 19/25 is only useful if you know WHICH cases.
const failed = [...new Set([...out.matchAll(/^[^\w\n]*\u2716 (.+?) \([\d.]+ms\)/gm)].map((m) => m[1]))]
console.log('')
console.log('TASKFAIL ' + JSON.stringify(failed))
console.log('TASKSCORE ' + JSON.stringify({
  task: id, pass, fail: Math.max(fail, authored - pass), authored,
  score: Number(score.toFixed(4)), files: files.length, note: note || undefined,
}))

// 3. leave nothing behind in the agent's repo.
// A failure here must NOT change the score or the exit code: the score was already computed
// and printed. Reported, never raised.
try { safeClean(dest) } catch (e) { console.error('WARN could not remove staging dir ' + dest + ': ' + e.message) }

process.exit(r.status === 0 && pass === authored ? 0 : 1)
