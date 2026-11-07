#!/usr/bin/env node
/**
 * validate-tasks — check a task suite before it costs hours of runs.
 *
 * The expensive failure mode is a task that cannot discriminate: one every arm
 * solves, or one nothing solves, or one whose result is not deterministic. Each
 * burns runs and contributes variance without contributing signal.
 *
 * Checks, in order of how much they matter:
 *   1. BROKEN-BEFORE     the test suite must FAIL on the untouched fixture.
 *                        A task that already passes measures nothing - this is a
 *                        real bug that was shipped once and produced a full matrix
 *                        of meaningless 100% solve rates.
 *   2. DETERMINISTIC     the test must give the same verdict twice in a row.
 *   3. NO ARTIFACTS      no node_modules, .git, or build output in the fixture.
 *   4. SHAPE             task.json has the required fields and the fixture exists.
 *   5. DISCRIMINATION    warn when the suite is a single assertion, which rarely
 *                        separates competent from incompetent solutions.
 *
 *   node tools/validate-tasks.mjs [--dir tasks] [--jobs 4]
 */
import { readFileSync, existsSync, readdirSync, cpSync, statSync } from 'node:fs'
import { safeClean } from './safe-fs.mjs'
import { dirname, join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { resolveTestCommand } from './test-command.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const dir = resolve(opt('--dir', 'tasks'))
const jobs = Math.max(1, Number(opt('--jobs', 4)))

if (!existsSync(dir)) { console.error('no tasks directory at ' + dir); process.exit(2) }
const ids = readdirSync(dir).filter((d) => existsSync(join(dir, d, 'task.json')))
if (!ids.length) { console.error('no tasks found in ' + dir); process.exit(2) }

const ARTIFACT_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'target', '__pycache__', '.venv', 'venv']
const ARTIFACT_FILES = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', '.DS_Store']

function runShell(cmd, cwd, timeoutMs = 300000) {
  return new Promise((res) => {
    const child = spawn(cmd, [], { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    const t = setTimeout(() => { try { child.kill() } catch {} ; res({ status: null, out, timedOut: true }) }, timeoutMs)
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { out += d })
    child.on('error', (e) => { clearTimeout(t); res({ status: null, out: out + String(e.message) }) })
    child.on('close', (code) => { clearTimeout(t); res({ status: code, out }) })
  })
}

function walk(root, base = root, acc = []) {
  for (const e of readdirSync(root)) {
    const p = join(root, e)
    acc.push(p.slice(base.length + 1))
    if (statSync(p).isDirectory()) walk(p, base, acc)
  }
  return acc
}

async function check(id) {
  const taskDir = join(dir, id)
  const issues = [], warns = []

  let spec
  try { spec = JSON.parse(readFileSync(join(taskDir, 'task.json'), 'utf8')) }
  catch (e) { return { id, ok: false, issues: ['task.json does not parse: ' + e.message], warns } }

  for (const f of ['prompt', 'test']) {
    if (!spec[f] || typeof spec[f] !== 'string' || !spec[f].trim()) issues.push('task.json is missing "' + f + '"')
  }
  const repoSrc = spec.repo ? resolve(taskDir, spec.repo) : null
  if (!repoSrc || !existsSync(repoSrc)) { issues.push('fixture not found at ' + (spec.repo ?? '(no repo field)')); return { id, ok: false, issues, warns } }

  const files = walk(repoSrc)
  for (const f of files) {
    const base = f.split(/[\\/]/)[0]
    if (ARTIFACT_DIRS.includes(base) || ARTIFACT_DIRS.includes(f)) { issues.push('fixture contains ' + f + ' - commit the source, not the installed tree'); break }
  }
  for (const f of files) if (ARTIFACT_FILES.includes(f)) warns.push('fixture contains ' + f + ' (usually regenerable)')
  if (!files.length) issues.push('fixture is empty')

  // 0. THE SUITE HAS TO EXIST. A grader that cannot run is NOT a task that fails.
  //
  // Until 2026-10-03 the ONLY evidence consulted for BROKEN-BEFORE was a non-zero exit - and a
  // grader that CRASHES exits non-zero too. Forty scaffolded tasks (a "TODO" prompt, an empty
  // fixture/test/, an empty grade/tests/, an empty reference/) were reported "40 tasks, 40 valid,
  // 0 invalid" while the per-task gate, tasks-b/_tools/verify-task.mjs, failed every one of them.
  //
  // This is the repo's own rule applied to its own tool: "a non-zero exit is not evidence until
  // its cause is known" - and the mirror of "an absent number read as a measurement".
  const visible = files.filter((f) => /\.(test|spec)\.(js|mjs|cjs)$/.test(f))
  if (!visible.length) {
    issues.push('the fixture has no visible test suite: the agent gets no reproduction, and ' +
      'BROKEN-BEFORE has nothing to be about')
  }
  if (/^\s*TODO\b|\bTODO:/i.test(spec.prompt ?? '')) {
    issues.push('the prompt is still the scaffold placeholder: "' + String(spec.prompt).slice(0, 44) + '"')
  }
  if (existsSync(join(taskDir, 'grade'))) {
    const gradeTests = join(taskDir, 'grade', 'tests')
    const caseFiles = existsSync(gradeTests) ? readdirSync(gradeTests).filter((f) => /\.test\.(mjs|js|cjs)$/.test(f)) : []
    let authored = 0
    for (const f of caseFiles) authored += (readFileSync(join(gradeTests, f), 'utf8').match(/^test\(/gm) ?? []).length
    if (!caseFiles.length || !authored) {
      issues.push('the hidden suite is empty: ' + caseFiles.length + ' case file(s) and ' + authored +
        ' authored case(s) in grade/tests. A grader with nothing to run is not a failing suite.')
    }
  }

  if (issues.length) return { id, ok: false, issues, warns }

  // 1 + 2: the test must fail now, and fail the same way twice.
  // `dsh-exp-` marks this as a designated scratch root so safeClean will remove it.
  const wd = join(tmpdir(), 'dsh-exp-taskcheck-' + id + '-' + Date.now())
  const results = []
  try {
    cpSync(repoSrc, wd, { recursive: true })
    if (spec.setup) await runShell(spec.setup, wd)
    const testCmd = resolveTestCommand(spec.test, repoRoot)
    const a = await runShell(testCmd, wd)
    results.push(a.status)
    // A CRASH is not a failing suite. Both exit non-zero; only one is evidence that the task is
    // broken before the fix.
    //
    // CORRECTED 2026-10-04. This used to test for a bare /SyntaxError/i, and that produced a FALSE
    // POSITIVE on edge-json-schema: its hidden suite asserts that a broken regular expression is
    // rejected with SchemaError, the un-fixed fixture throws SyntaxError instead, and node prints the
    // two names together inside the assertion message -
    //     The error is expected to be an instance of "SchemaError". Received "SyntaxError"
    // The validator read that word as a crash and failed a task whose reference passes 24/24.
    //
    // The distinction that survives is a SHAPE, not a word: a grader that dies before running
    // anything prints no test-runner summary at all, while one that fails its assertions prints
    // pass/fail counts and can also print a SyntaxError in the *payload* it is complaining about.
    // Measured against node v24.19.0 on both shapes (see tools/validate-tasks.test.mjs).
    const out0 = String(a.out ?? '')
    const ranATest = /(?:^|\n)\s*[^\w\n]*pass \d+|(?:^|\n)\s*[^\w\n]*fail \d+/.test(out0)
    const CRASH = /no \*\.test\.mjs|Cannot find module|ERR_MODULE_NOT_FOUND|Could not find any test files|\bSyntaxError:/i
    if (a.status !== 0 && !ranATest && CRASH.test(out0)) {
      const line = out0.split('\n').find((l) => CRASH.test(l)) ?? ''
      issues.push('the grader ERRORED rather than failing its assertions: ' + line.trim().slice(0, 110) +
        ' - a crash is not evidence that the task is broken-before')
    }
    if (a.timedOut) issues.push('test timed out')
    const b = await runShell(testCmd, wd)
    results.push(b.status)
    if (results[0] !== results[1]) issues.push('test is not deterministic: exit ' + results[0] + ' then ' + results[1])
    if (results[0] === 0) {
      issues.push('TEST ALREADY PASSES on the untouched fixture - this task cannot discriminate. ' +
        'Every arm will "solve" it and the run measures nothing.')
    }
    const assertions = ((b.out ?? '').match(/\b(test|it|assert)\s*\(/g) ?? []).length
    if (assertions > 0 && assertions <= 1) warns.push('the suite looks like a single assertion; it may not separate good from bad solutions')
  } finally {
    try { safeClean(wd) } catch (e) { console.error('WARN cleanup of ' + wd + ': ' + e.message) }
  }

  return { id, ok: issues.length === 0, issues, warns }
}

const queue = [...ids]
const out = []
await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => {
  for (;;) {
    const id = queue.shift()
    if (!id) return
    const r = await check(id)
    out.push(r)
    console.log('  ' + (r.ok ? 'PASS' : 'FAIL') + '  ' + id.padEnd(30) +
      (r.issues.length ? r.issues.length + ' issue(s)' : '') + (r.warns.length ? '  ' + r.warns.length + ' warn' : ''))
    for (const i of r.issues) console.log('          ! ' + i)
    for (const w of r.warns) console.log('          ~ ' + w)
  }
}))

out.sort((a, b) => a.id.localeCompare(b.id))
const bad = out.filter((r) => !r.ok)
console.log('')
console.log(out.length + ' tasks, ' + (out.length - bad.length) + ' valid, ' + bad.length + ' invalid')
if (out.length < 15) console.log('NOTE: ' + out.length + ' tasks. The design targets 20-40; below ~15 the paired tests have little power.')
process.exit(bad.length ? 1 : 0)
