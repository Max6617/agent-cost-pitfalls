#!/usr/bin/env node
/**
 * verify-task — the gate every tasks-hard task must pass before it is finished.
 *
 * The validator in tools/ can only check that the test FAILS on the untouched
 * fixture. That is necessary and not nearly sufficient: a task whose hidden suite
 * already passes 80% of its cases, or which no correct solution can score 100% on,
 * is worthless in a different way. This checks both ends, on a real copy of the
 * fixture, and it checks the fixture's shape.
 *
 *   node tasks-hard/_tools/verify-task.mjs               # every task
 *   node tasks-hard/_tools/verify-task.mjs lh-ledger-replay
 *   node tasks-hard/_tools/verify-task.mjs --quiet       # only failures + summary
 *
 * What it enforces, per task:
 *   1. shape      10-25 files, ~400-1,500 lines, no dependencies, no artifacts
 *   2. suite      18-25 authored `test(` cases across >=4 files, no .only/.skip
 *   3. broken     untouched fixture FAILS the hidden suite and scores <= 35% of it
 *   4. visible    untouched fixture FAILS the visible test/ suite as well
 *   5. solvable   overlaying reference/ scores 100% on the hidden suite AND
 *                 passes the visible suite, and reports exactly `authored` cases
 */
import { readdirSync, readFileSync, existsSync, statSync, cpSync, mkdtempSync } from 'node:fs'
import { safeClean } from '../../tools/safe-fs.mjs'
import { join, resolve, dirname, relative } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const batchRoot = resolve(here, '..')
const repoRoot = resolve(batchRoot, '..')
const grader = join(batchRoot, '_grade', 'run.mjs')

const argv = process.argv.slice(2)
const quiet = argv.includes('--quiet')
const only = argv.find((a) => !a.startsWith('--'))

const ARTIFACTS = ['node_modules', '.git', 'dist', 'build', '.next', 'target', '__pycache__', '.venv', 'venv', '.grade']
const TEXT = /\.(js|mjs|cjs|json|md|txt|csv|yml|yaml)$/

function walk(root, base = root, acc = []) {
  for (const e of readdirSync(root)) {
    const p = join(root, e)
    acc.push(relative(base, p))
    if (statSync(p).isDirectory()) walk(p, base, acc)
  }
  return acc
}

function runVisible(dir) {
  const r = spawnSync(process.execPath, ['--test'], { cwd: dir, encoding: 'utf8', timeout: 300000, env: { ...process.env, NO_COLOR: '1' } })
  const out = (r.stdout ?? '') + (r.stderr ?? '')
  const num = (re) => { const m = out.match(re); return m ? Number(m[1]) : 0 }
  return { status: r.status, pass: num(/(?:^|\n)[^\w\n]*pass (\d+)/), fail: num(/(?:^|\n)[^\w\n]*fail (\d+)/), out }
}

function runGrader(dir, id) {
  const r = spawnSync(process.execPath, [grader, id, dir], { cwd: dir, encoding: 'utf8', timeout: 300000, env: { ...process.env, NO_COLOR: '1' } })
  const out = (r.stdout ?? '') + (r.stderr ?? '')
  const m = out.match(/TASKSCORE (\{.*\})/)
  let score = null
  if (m) { try { score = JSON.parse(m[1]) } catch { score = null } }
  return { status: r.status, out, score }
}

function check(id) {
  const dir = join(batchRoot, id)
  const errs = [], warns = [], info = []
  const spec = JSON.parse(readFileSync(join(dir, 'task.json'), 'utf8'))
  const fixture = resolve(dir, spec.repo ?? './fixture')
  const refDir = join(dir, 'reference')
  const testsDir = join(dir, 'grade', 'tests')

  if (!spec.prompt || spec.prompt.length < 40) errs.push('prompt is missing or too short')
  if (/src\/|test\/[a-z]/i.test(spec.prompt) && /\b(line|change|edit|fix)\b/i.test(spec.prompt)) warns.push('prompt looks like it names the fix')
  if (!existsSync(testsDir)) { errs.push('no hidden suite at grade/tests'); return { id, errs, warns, info } }
  if (!existsSync(refDir)) { errs.push('no reference/ solution - solvability is unproven'); return { id, errs, warns, info } }

  // ---- 2. suite shape ----
  const testFiles = readdirSync(testsDir).filter((f) => f.endsWith('.test.mjs')).sort()
  let authored = 0
  for (const f of testFiles) {
    const src = readFileSync(join(testsDir, f), 'utf8')
    const n = (src.match(/^test\(/gm) ?? []).length
    authored += n
    info.push('  suite ' + f.padEnd(30) + String(n).padStart(3) + ' cases')
    if (/\btest\.(only|skip|todo)\s*\(/.test(src) || /\{\s*skip\s*:/.test(src)) errs.push(f + ' uses .only/.skip/.todo - those cases never count')
    if (n < 3) warns.push(f + ' has only ' + n + ' cases; sub-problems should be spread over files')
    if (/\bt\s*\.\s*(test|describe)\s*\(/.test(src)) errs.push(f + ' uses subtests; the authored count assumes one top-level test() per case')
  }
  if (authored < 18) errs.push('hidden suite has only ' + authored + ' authored cases (need 18-25)')
  if (authored > 25) errs.push('hidden suite has ' + authored + ' authored cases (need 18-25; more files, not more cases)')
  if (testFiles.length < 4) errs.push('hidden suite spans only ' + testFiles.length + ' file(s); 4-6 sub-problems expected')
  info.push('  authored cases: ' + authored + ' across ' + testFiles.length + ' files')

  // ---- 1. fixture shape ----
  if (!existsSync(fixture)) { errs.push('fixture missing at ' + spec.repo); return { id, errs, warns, info } }
  const files = walk(fixture)
  for (const f of files) {
    if (f.split(/[\\/]/).some((seg) => ARTIFACTS.includes(seg))) { errs.push('fixture contains artifact path ' + f); break }
  }
  const textFiles = files.filter((f) => TEXT.test(f) && statSync(join(fixture, f)).isFile())
  const lines = textFiles.reduce((n, f) => n + readFileSync(join(fixture, f), 'utf8').split('\n').length, 0)
  info.push('  fixture: ' + textFiles.length + ' text files, ' + lines + ' lines')
  if (!textFiles.some((f) => /^test[/\\].*\.test\.[cm]?js$/.test(f))) errs.push('fixture has no visible test/ suite')
  if (lines < 350) errs.push('fixture is only ' + lines + ' lines; the batch targets 400-1,500 across 10-25 files')
  if (lines > 1800) errs.push('fixture is ' + lines + ' lines; too large for the batch budget (400-1,500)')
  if (textFiles.length < 9) errs.push('fixture has only ' + textFiles.length + ' files; the batch targets 10-25')
  if (textFiles.length > 30) warns.push('fixture has ' + textFiles.length + ' files; the batch targets 10-25')
  const pkgPath = join(fixture, 'package.json')
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    const deps = Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) })
    if (deps.length) errs.push('fixture declares dependencies (' + deps.join(', ') + '); there is no network and no node_modules')
  } else errs.push('fixture has no package.json')

  // ---- reference may only modify existing files ----
  const refFiles = walk(refDir).filter((f) => statSync(join(refDir, f)).isFile())
  const added = refFiles.filter((f) => !existsSync(join(fixture, f)))
  if (added.length) errs.push('reference/ adds files the agent never sees: ' + added.join(', '))
  const changed = refFiles.filter((f) => existsSync(join(fixture, f)) &&
    readFileSync(join(fixture, f), 'utf8') !== readFileSync(join(refDir, f), 'utf8'))
  if (!changed.length) errs.push('reference/ is identical to fixture/ - the task is already solved')
  info.push('  reference changes ' + changed.length + ' file(s): ' + changed.slice(0, 8).join(', ') + (changed.length > 8 ? ' ...' : ''))

  // ---- 3/4/5. run it ----
  // The `dsh-exp-` prefix is not decoration: it is what marks a temp directory as a designated
  // scratch root, so safeClean will remove it at the end of this function. A `verify-*` name
  // would be refused and the directory would leak.
  const wd = mkdtempSync(join(tmpdir(), 'dsh-exp-verify-' + id + '-'))
  try {
    cpSync(fixture, wd, { recursive: true })
    const visBroken = runVisible(wd)
    const grBroken = runGrader(wd, id)
    if (!grBroken.score) errs.push('hidden grader produced no TASKSCORE line (broken fixture run)')
    else {
      const s = grBroken.score
      info.push('  broken: visible ' + visBroken.pass + '/' + (visBroken.pass + visBroken.fail) + ' pass (exit ' + visBroken.status + '), hidden ' +
        s.pass + '/' + s.authored + ' = ' + (s.score * 100).toFixed(0) + '%   ' + (s.note ?? ''))
      if (s.error) errs.push('grader error: ' + s.error)
      if (s.score === null || s.score > 0.35) errs.push('untouched fixture already scores ' + ((s.score ?? 0) * 100).toFixed(0) + '% of the hidden suite; a plausible solution would score ~100%')
      if (grBroken.status === 0) errs.push('hidden suite PASSES on the untouched fixture')
      if (s.pass + (s.fail ?? 0) < s.authored) warns.push((s.authored - s.pass - (s.fail ?? 0)) + ' case(s) never reported on the broken fixture')
    }
    if (visBroken.status === 0) errs.push('the visible test/ suite already passes on the untouched fixture; the agent gets no reproduction')

    // overlay the reference
    cpSync(refDir, wd, { recursive: true, force: true })
    const visFixed = runVisible(wd)
    const grFixed = runGrader(wd, id)
    if (!grFixed.score) errs.push('hidden grader produced no TASKSCORE line (reference run)')
    else {
      const s = grFixed.score
      info.push('  fixed : visible ' + visFixed.pass + '/' + (visFixed.pass + visFixed.fail) + ' pass (exit ' + visFixed.status + '), hidden ' +
        s.pass + '/' + s.authored + ' = ' + (s.score * 100).toFixed(0) + '%   ' + (s.note ?? ''))
      if (s.pass !== s.authored) errs.push('reference solution scores only ' + s.pass + '/' + s.authored + ' - the task is not solvable as written')
      if (grFixed.status !== 0) errs.push('reference solution does not exit 0 on the hidden suite')
      if (s.pass + (s.fail ?? 0) !== s.authored) errs.push('reference run reported ' + (s.pass + (s.fail ?? 0)) + ' cases but ' + s.authored + ' are authored; a case is being generated dynamically or swallowed')
    }
    if (visFixed.status !== 0) errs.push('reference solution does not pass the visible suite (exit ' + visFixed.status + ') - visible and hidden disagree')
  } finally {
    // Cleanup must never mask the real error: a throw in a finally block REPLACES the
    // exception that was already propagating, which is how cline's EPERM ate its own
    // failure record. A refused or failed cleanup is reported, not raised.
    try { safeClean(wd) } catch (e) { console.error('WARN cleanup of ' + wd + ': ' + e.message) }
  }

  return { id, errs, warns, info }
}

const ids = readdirSync(batchRoot).filter((d) => existsSync(join(batchRoot, d, 'task.json'))).filter((d) => !only || d === only).sort()
if (!ids.length) { console.error('no tasks found' + (only ? ' matching ' + only : '') + ' in ' + batchRoot); process.exit(2) }

const results = []
for (const id of ids) {
  process.stdout.write((quiet ? '' : '') + 'verifying ' + id + ' ... ')
  let r
  try { r = check(id) } catch (e) { r = { id, errs: ['threw: ' + (e?.message ?? e)], warns: [], info: [] } }
  results.push(r)
  const status = r.errs.length ? 'FAIL' : (r.warns.length ? 'WARN' : 'ok')
  console.log(status)
  if (!quiet || r.errs.length) {
    for (const l of r.info) console.log(l)
    for (const w of r.warns) console.log('  ~ ' + w)
    for (const e of r.errs) console.log('  ! ' + e)
  }
}

const bad = results.filter((r) => r.errs.length)
const warn = results.filter((r) => !r.errs.length && r.warns.length)
console.log('')
console.log(results.length + ' tasks: ' + (results.length - bad.length) + ' pass, ' + bad.length + ' fail, ' + warn.length + ' with warnings')
if (bad.length) console.log('failing: ' + bad.map((r) => r.id).join(', '))
process.exit(bad.length ? 1 : 0)
