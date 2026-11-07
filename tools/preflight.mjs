/**
 * preflight.mjs - run ONE cell per harness before spending an hour and a hundred runs.
 *
 * WHY THIS EXISTS. On 2026-10-01 a 168-run hard-task matrix was launched against Qwen. Every one
 * of the 540 DSH requests came back 400 "InvalidParameter: Request body format invalid" while all
 * 2,385 opencode requests to the same gateway succeeded. 132 of 154 runs measured nothing. The
 * loss was not the money - it was the hour and a half, and a batch that looked like a capability
 * result for a model that never saw the task.
 *
 * PRE-REGISTRATION.md already requires credit to be verified before a matrix starts. It requires
 * nothing about the request PATH, and that is the gap: a provider can be funded, the gateway can
 * be healthy, and one harness's wire format can still be rejected outright.
 *
 * This sends one real cell per harness through the real gateway and asks the only question that
 * matters: did ANY request from this harness succeed? A harness whose every request failed cannot
 * be compared to anything, and the matrix must not start.
 *
 *   node tools/preflight.mjs --gateway http://127.0.0.1:8801 --model qwen3.8-flash \
 *     --tasks tasks-hard --harness dsh --harness opencode
 *
 * Exits 0 if every harness got at least one 200, non-zero otherwise. Spends a few cents.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { parseSyntheticKey } from './attribute.mjs'
import { safeClean } from './safe-fs.mjs'
import { STUDY_HARNESSES } from './harnesses.mjs'

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const opts = (n) => { const o = []; argv.forEach((a, i) => { if (a === n && argv[i + 1]) o.push(argv[i + 1]) }); return o }

const gateway = opt('--gateway', 'http://127.0.0.1:8787')
const model = opt('--model', null)
const tasksDir = opt('--tasks', 'tasks')
const logPath = opt('--log', null)
// EVERY harness, not just dsh. A preflight that only asks dsh whether it can reach the
// provider is a preflight that says PASSED while four harnesses are broken - which is
// exactly what happened to cline.
const harnesses = opts('--harness').length ? opts('--harness') : STUDY_HARNESSES
// A UNIQUE probe directory per invocation, so there is nothing to delete.
//
// This was `results/_scratch/preflight` with a safeClean() in front of it, and the second run
// of collect.mjs stopped dead: the first run had left a runs.jsonl in there, and safe-fs
// correctly REFUSED to remove a directory containing run records. That refusal is the guard
// doing its job - the fix is not to weaken the guard, it is to stop needing it. Every probe now
// gets its own directory, the same way the gateway self-test gets its own log file.
const outDir = opt('--out', join('results', '_scratch', 'preflight-' + Date.now().toString(36)))

if (!existsSync(tasksDir)) { console.error('no tasks directory at ' + tasksDir); process.exit(2) }
if (!logPath) { console.error('--log is required: the gateway writes where IT was started, and guessing it is how costs read zero'); process.exit(2) }

// The cheapest task available: preflight should cost as little as possible.
function fixtureLines(dir) {
  let n = 0
  const walk = (p) => { for (const e of readdirSync(p, { withFileTypes: true })) { const q = join(p, e.name); if (e.isDirectory()) { if (e.name !== '.git') walk(q) } else { try { n += readFileSync(q, 'utf8').split('\n').length } catch {} } } }
  try { walk(join(dir, 'fixture')) } catch {}
  return n
}
const tasks = readdirSync(tasksDir).filter((d) => existsSync(join(tasksDir, d, 'task.json')))
if (!tasks.length) { console.error('no tasks in ' + tasksDir); process.exit(2) }
const probe = tasks.map((t) => ({ t, n: fixtureLines(join(tasksDir, t)) })).sort((a, b) => a.n - b.n)[0].t

console.log('PREFLIGHT - one cell per harness, cheapest available task')
console.log('  gateway : ' + gateway)
console.log('  model   : ' + (model ?? '(whatever the gateway enforces)'))
console.log('  task    : ' + probe + '  (' + tasksDir + ')')
console.log('  harness : ' + harnesses.join(', '))
console.log('')

// ============================ READ THIS BEFORE MOVING THIS LINE ============================
// THIS LINE DELETED THE STUDY. On 2026-10-02 it was run as `preflight --out results`, and
// `rmSync('results', { recursive: true, force: true })` removed every run record and every
// gateway log the project had: 24 matrices, ~5,900 runs, ~102,000 gateway records. Only the four
// gateway logs held open by a running process survived, because Windows will not delete an open
// file. Nothing was in git - results/ is gitignored - and rmSync does not use the Recycle Bin.
//
// The guard below was written for the OTHER rmSync in this file (the one after the probe) and
// this one was left bare. A hostile review had already named both sites:
//   "rmSync(outDir, recursive) on a verbatim --out (preflight.mjs:60, :107) would delete the
//    entire results archive given --out results."
// I fixed :107, then typed `--out results` to test the fix. :60 ran first.
//
// THERE IS NO GUARD IN THIS FILE ANY MORE, AND THAT IS THE FIX.
//
// The author's response to the review was to write a guard here, hoist it, and test it with
// --out results. The guard was correct and the archive still died, because the deletion did
// not depend on the guard: it depended on a call site that a future edit could move, reorder,
// or copy. A guard at a call site is a promise that the next person reads the comment.
//
// The deletion now lives in tools/safe-fs.mjs, it refuses a direct child of results/ outright,
// it has no override flag, and tools/safe-fs.test.mjs asserts that safeClean('results'),
// safeClean('results/ds-full') and safeClean('.') all throw. safeClean(outDir) below will
// refuse --out results, refuse --out results/ds-full, and allow only a path strictly inside
// results/_scratch.
// ===========================================================================================
try {
  safeClean(outDir)
} catch (e) {
  console.error('refusing to clean --out ' + resolve(outDir))
  console.error('  ' + e.message)
  if (e.detail && e.detail.note) console.error('  ' + e.detail.note)
  console.error('  A probe directory must live strictly inside results/_scratch. There is no override.')
  process.exit(2)
}
mkdirSync(outDir, { recursive: true })

const args = ['tools/run-experiment.mjs', '--only', probe, '--seeds', '1', '--jobs', opt('--jobs', '4'), '--tasks', tasksDir, '--out', outDir]
for (const h of harnesses) args.push('--harness', h)
if (model) args.push('--model', model)
args.push('--gateway', gateway)
const r = spawnSync(process.execPath, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
if (r.status !== 0) {
  console.error('the probe matrix itself failed to run:')
  console.error((r.stderr ?? '').slice(-1200) || (r.stdout ?? '').slice(-1200))
  process.exit(3)
}

const runFile = join(outDir, 'runs.jsonl')
if (!existsSync(runFile)) { console.error('no run records at ' + runFile); process.exit(3) }
const runs = readFileSync(runFile, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)

// Join to the gateway by runId, the way every other tool does.
const gw = []
for (const line of readFileSync(logPath, 'utf8').split('\n')) {
  if (!line.trim()) continue
  let o; try { o = JSON.parse(line) } catch { continue }
  const a = parseSyntheticKey(o.syntheticKey)
  gw.push({ ...o, runId: a?.runId ?? o.runId, harness: a?.harness ?? o.harness })
}
const byRun = new Map()
for (const g of gw) { if (!byRun.has(g.runId)) byRun.set(g.runId, []); byRun.get(g.runId).push(g) }

console.log('  ' + 'harness'.padEnd(12) + 'runs'.padStart(5) + 'requests'.padStart(10) + '2xx'.padStart(7) + 'failed'.padStart(8) + '   verdict')
const failed = []
// TWO INVERSIONS FIXED HERE, both found by a third hostile review.
//
// 1. SUCCESS WAS `status < 400`, AND THE GATEWAY LOGS `status: 0` WHEN ITS UPSTREAM fetch() THROWS
//    (DNS failure, connection refused, body timeout - measure-gateway.mjs:525 and :854). `0 < 400`
//    is true, so a harness whose every request failed reported "ok" and preflight exited 0. That is
//    precisely the "funded but the path is broken" case this tool exists to catch. Success now
//    requires a real 2xx.
// 2. THE HARNESS LIST INCLUDED `undefined`. run-experiment.mjs:485's exception record carries no
//    `harness` field, so the union produced a phantom row with no requests, which failed the run.
//    Any single runOne exception - on Windows the rmSync in the finally can throw EPERM *after* a
//    successful run - poisoned an otherwise passing preflight.
const present = runs.map((x) => x.harness).filter((h) => typeof h === 'string' && h)
for (const h of [...new Set([...harnesses, ...present])]) {
  const mine = runs.filter((x) => x.harness === h)
  const reqs = mine.flatMap((x) => byRun.get(x.runId) ?? [])
  // A 2xx is the only success. 0 (upstream fetch threw) and 4xx/5xx are all failures.
  const ok = reqs.filter((q) => Number(q.status) >= 200 && Number(q.status) < 300)
  const bad = reqs.filter((q) => !(Number(q.status) >= 200 && Number(q.status) < 300))
  const verdict = !reqs.length ? 'NO REQUESTS REACHED THE GATEWAY'
    : !ok.length ? (bad.some((q) => Number(q.status) === 0)
        ? 'EVERY REQUEST FAILED AT THE TRANSPORT (status 0) - do not start a matrix'
        : 'EVERY REQUEST FAILED - do not start a matrix')
    : 'ok'
  if (!ok.length) failed.push({ h, n: reqs.length, first: bad[0] })
  console.log('  ' + h.padEnd(12) + String(mine.length).padStart(5) + String(reqs.length).padStart(10) +
    String(ok.length).padStart(7) + String(bad.length).padStart(8) + '   ' + verdict)
  if (!ok.length && bad.length && bad[0].upstreamError) {
    console.log('  ' + ''.padEnd(12) + 'first error: ' + String(bad[0].upstreamError).slice(0, 200).replace(/\s+/g, ' '))
  }
}

console.log('')
if (failed.length) {
  console.error('PREFLIGHT FAILED for: ' + failed.map((f) => f.h).join(', '))
  console.error('Those harnesses cannot be measured against this provider right now. Fix the path,')
  console.error('or drop them from the matrix - a harness that measures nothing is worse than an')
  console.error('absent one, because its zeros read as results.')
  process.exit(1)
}
console.log('PREFLIGHT PASSED - every harness reached the provider at least once.')
