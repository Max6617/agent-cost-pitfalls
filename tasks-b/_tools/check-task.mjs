#!/usr/bin/env node
/**
 * check-task (tasks-b) — the same 5-arm matrix as tools/check-task.mjs, on a
 * task in THIS batch, reporting the fraction of hidden cases each arm passed.
 *
 * tools/check-task.mjs hardcodes the batch-1 tasks directory and prints only a
 * solve-rate verdict. With a partial-credit suite, "solved" is 100%-or-nothing
 * and hides the thing this batch exists to measure: whether the arms land on
 * different fractions. So this runs the identical runner against tasks-b and
 * reads the TASKSCORE line out of every run.
 *
 *   node tasks-b/_tools/check-task.mjs lh-ledger-replay --seeds 3
 */
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { safeClean } from '../../tools/safe-fs.mjs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { indexByRun } from '../../tools/attribute.mjs'
import { PRICES } from '../../tools/prices.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const batchRoot = resolve(here, '..')
const repoRoot = resolve(batchRoot, '..')

const argv = process.argv.slice(2)
const id = argv.find((a) => !a.startsWith('--'))
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const seeds = Number(opt('--seeds', 3))
const jobs = String(opt('--jobs', 5))
const harnesses = []
argv.forEach((a, i) => { if (a === '--harness' && argv[i + 1]) harnesses.push(argv[i + 1]) })
if (!harnesses.length) harnesses.push('dsh', 'opencode')

if (!id) { console.error('usage: node tasks-b/_tools/check-task.mjs <task-id> [--seeds N]'); process.exit(2) }
if (!existsSync(join(batchRoot, id, 'task.json'))) { console.error('no such task: tasks-b/' + id); process.exit(2) }

// Inside results/_scratch, not directly under results: safeClean refuses a direct child of
// the archive (rule R4), and a check run is scratch rather than a matrix.
const out = join(repoRoot, 'results', '_scratch', 'check-' + id)
safeClean(out)
mkdirSync(out, { recursive: true })

console.log('running the matrix on "' + id + '" - ' + harnesses.join(' + ') + ', ' + seeds + ' seeds, ' + jobs + ' jobs')
const args = ['tools/run-experiment.mjs', '--tasks', batchRoot, '--only', id, '--seeds', String(seeds),
  '--jobs', jobs, '--out', out, '--model', 'deepseek-flash']
for (const h of harnesses) args.push('--harness', h)
const run = spawnSync(process.execPath, args, { cwd: repoRoot, encoding: 'utf8' })
process.stdout.write((run.stdout ?? '').split('\n').filter((l) => /^\[|runs in|model|records/.test(l)).slice(-3).join('\n') + '\n')
if (run.status !== 0) { console.error((run.stderr ?? '').slice(-800)); process.exit(run.status ?? 1) }

const runsPath = join(out, 'runs.jsonl')
const runs = readFileSync(runsPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const usagePath = join(repoRoot, 'results', 'gateway.jsonl')
const usage = existsSync(usagePath)
  ? readFileSync(usagePath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  : []
const { byRun, recovered } = indexByRun(usage)
if (recovered) console.log('(re-attributed ' + recovered + ' gateway records)')
// Card: tools/prices.mjs (single copy, corrected 2026-09-30).
function billed(run) {
  let c = 0
  for (const r of byRun.get(run.runId) ?? []) {
    const u = r.usage ?? {}
    const p = PRICES[r.model] ?? PRICES['deepseek-flash']
    c += ((u.cacheMissTokens ?? 0) / 1e6) * p.miss + ((u.cacheHitTokens ?? 0) / 1e6) * p.hit + ((u.outputTokens ?? 0) / 1e6) * p.out
  }
  return c
}
function scoreOf(r) {
  const m = String(r.testOutputTail ?? '').match(/TASKSCORE (\{.*?\})/)
  if (!m) return null
  try { return JSON.parse(m[1]) } catch { return null }
}
const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const k = s.length >> 1
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2 }

const arms = [...new Set(runs.map((r) => r.arm))].sort()
const rows = arms.map((a) => {
  const rs = runs.filter((r) => r.arm === a)
  const scores = rs.map(scoreOf)
  const got = scores.filter(Boolean)
  const costs = rs.map(billed).filter((c) => c > 0)
  return {
    arm: a, n: rs.length,
    solved: rs.filter((r) => r.solved).length,
    mean: got.length ? got.reduce((s, g) => s + g.score, 0) / got.length : null,
    median: med(got.map((g) => g.score)),
    cases: rs.map((r, i) => scores[i] ? scores[i].pass + '/' + scores[i].authored : '-').join(' '),
    cost: costs.length ? costs.reduce((x, y) => x + y, 0) / costs.length : 0,
  }
})

console.log('')
console.log('  ' + 'arm'.padEnd(18) + 'n'.padStart(3) + 'solved'.padStart(8) + 'mean'.padStart(8) + 'median'.padStart(8) + 'billed/run'.padStart(12) + '   cases passed/authored per run')
for (const r of rows) {
  console.log('  ' + r.arm.padEnd(18) + String(r.n).padStart(3) + String(r.solved).padStart(8) +
    (r.mean === null ? '   n/a' : ((r.mean * 100).toFixed(0) + '%').padStart(8)) +
    (r.median === null ? '     n/a' : ((r.median * 100).toFixed(0) + '%').padStart(8)) +
    ('$' + r.cost.toFixed(5)).padStart(12) + '   ' + r.cases)
}

const means = rows.map((r) => r.mean).filter((v) => v !== null)
const rates = rows.map((r) => r.solved / r.n)
const meanSpread = means.length > 1 ? Math.max(...means) - Math.min(...means) : 0
const rateSpread = Math.max(...rates) - Math.min(...rates)
console.log('')
console.log('  fraction spread   : ' + (meanSpread * 100).toFixed(0) + ' points')
console.log('  solve-rate spread : ' + (rateSpread * 100).toFixed(0) + ' points')
console.log('')
const all = rates.every((r) => r === 1)
const none = rates.every((r) => r === 0)
const floor = means.length ? Math.min(...means) : 0
if (all && floor > 0.95) {
  console.log('  VERDICT: TOO EASY - every arm scored essentially 100%. Make it harder.')
} else if (none && floor < 0.5) {
  console.log('  VERDICT: TOO HARD - no arm solved it. Check the fixture is solvable at all.')
} else if (meanSpread >= 0.15 || rateSpread >= 0.3) {
  console.log('  VERDICT: DISCRIMINATING - the arms separate on fraction passed or solve rate.')
} else if (meanSpread > 0.03) {
  console.log('  VERDICT: WEAK BUT IN THE INTERESTING MIDDLE - every arm attempts it, the')
  console.log('  fractions differ. More seeds would tell you whether it is real.')
} else {
  console.log('  VERDICT: FLAT - every arm lands on the same fraction. Not discriminating.')
}
console.log('')
console.log('  records: ' + runsPath)
console.log('  detail : node tasks-b/_tools/score-report.mjs ' + out)
