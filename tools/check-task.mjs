#!/usr/bin/env node
/**
 * check-task — does this task actually discriminate between harnesses?
 *
 * The validator catches tasks that are STRUCTURALLY broken (a test that already
 * passes, a flaky suite, artifacts in the fixture). It cannot catch the two
 * failures that waste the most runs:
 *
 *   TOO EASY   every arm solves it, so the run contributes variance and no signal
 *   TOO HARD   no arm solves it, same problem from the other end
 *
 * This runs the real matrix on ONE task - all arms, a few seeds - and reports
 * whether the arms separate. It costs about 30 seconds and a few cents, which is
 * nothing against the cost of discovering the problem after the full suite.
 *
 *   node tools/check-task.mjs example-fix
 *   node tools/check-task.mjs my-task --seeds 3
 */
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { safeClean } from './safe-fs.mjs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { indexByRun } from './attribute.mjs'
import { cardFor } from './prices.mjs'

const argv = process.argv.slice(2)
const id = argv.find((a) => !a.startsWith('--'))
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const seeds = Number(opt('--seeds', 3))

if (!id) { console.error('usage: node tools/check-task.mjs <task-id> [--seeds N]'); process.exit(2) }
// --dir lets this check a batch other than tasks/, which it could not do before: the
// second task batch lives in tasks-hard/ and every check reported "no such task".
const tasksDir = opt('--dir', 'tasks')
if (!existsSync(join(tasksDir, id, 'task.json'))) { console.error('no such task: ' + tasksDir + '/' + id); process.exit(2) }

// Inside results/_scratch, NOT directly under results. A check run is scratch, not a matrix,
// and safeClean refuses a direct child of the archive outright (rule R4). The old path here
// was `results/check-<id>`, which safe-fs would now refuse.
const out = join('results', '_scratch', 'check-' + id)
safeClean(out)
mkdirSync(out, { recursive: true })

console.log('running the matrix on "' + id + '" - all arms, ' + seeds + ' seeds')
// Every harness, not just dsh: the whole point is to see whether they separate.
const run = spawnSync(process.execPath, [
  'tools/run-experiment.mjs', '--only', id, '--seeds', String(seeds), '--jobs', '5', '--out', out,
  '--tasks', tasksDir,
  '--harness', 'dsh', '--harness', 'opencode',
], { encoding: 'utf8' })
process.stdout.write((run.stdout ?? '').split('\n').slice(-4).join('\n') + '\n')
if (run.status !== 0) { console.error((run.stderr ?? '').slice(-500)); process.exit(run.status ?? 1) }

const runs = readFileSync(join(out, 'runs.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
// The gateway writes its log where IT was started, not to the runner's --out, so
// looking in <out>/gateway.jsonl found nothing and every cost printed as $0.00000.
const usagePath = opt('--usage', join('results', 'gateway.jsonl'))
const usage = existsSync(usagePath)
  ? readFileSync(usagePath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  : []
if (!usage.length) console.log('WARNING: no gateway log at ' + usagePath + ' - costs will read zero')

// Identify each record from its RAW synthetic key rather than the logged runId.
// An earlier gateway split keys at any segment beginning with "r", filing usage
// under a harness no run queries - every cost then printed as $0.00000 while the
// runs themselves reported success, which is the most misleading possible failure.
const { byRun, recovered } = indexByRun(usage)
if (recovered) console.log('(re-attributed ' + recovered + ' log records from their synthetic keys)')
// Card: tools/prices.mjs (single copy, corrected 2026-09-30).
function billed(run) {
  let c = 0
  for (const r of byRun.get(run.runId) ?? []) {
    const u = r.usage ?? {}
    const p = cardFor(r.model, { required: true })
    c += ((u.cacheMissTokens ?? 0) / 1e6) * p.miss + ((u.cacheHitTokens ?? 0) / 1e6) * p.hit + ((u.outputTokens ?? 0) / 1e6) * p.out
  }
  return c
}

const arms = [...new Set(runs.map((r) => r.arm))]
const rows = arms.map((a) => {
  const rs = runs.filter((r) => r.arm === a)
  const solved = rs.filter((r) => r.solved).length
  const costs = rs.map((r) => billed(r)).filter((c) => c > 0)
  const avg = costs.length ? costs.reduce((x, y) => x + y, 0) / costs.length : 0
  return { arm: a, n: rs.length, solved, rate: solved / rs.length, cost: avg }
})

console.log('')
console.log('  ' + 'arm'.padEnd(20) + 'solved'.padStart(9) + '  ' + 'billed/run'.padStart(12))
for (const r of rows) console.log('  ' + r.arm.padEnd(20) + (r.solved + '/' + r.n).padStart(9) + ('$' + r.cost.toFixed(5)).padStart(13))

const rates = rows.map((r) => r.rate)
const costs = rows.map((r) => r.cost).filter((c) => c > 0)
const rateSpread = Math.max(...rates) - Math.min(...rates)
const costSpread = costs.length > 1 ? (Math.max(...costs) - Math.min(...costs)) / Math.max(...costs) : 0

console.log('')
console.log('  solve-rate spread : ' + (rateSpread * 100).toFixed(0) + ' points')
console.log('  cost spread       : ' + (costSpread * 100).toFixed(1) + '%')
console.log('')
const all = rates.every((r) => r === 1)
const none = rates.every((r) => r === 0)
if (all) {
  console.log('  VERDICT: TOO EASY - every arm solves it.')
  console.log('  It will not separate harnesses on quality, though the COST differences are')
  console.log('  still real and still measurable. Keep it if you want cost-only signal, and')
  console.log('  add harder variants alongside it.')
} else if (none) {
  console.log('  VERDICT: TOO HARD - no arm solves it. Check the fixture is solvable at all;')
  console.log('  a task nothing solves measures nothing.')
} else if (rateSpread >= 0.3) {
  console.log('  VERDICT: DISCRIMINATING - the arms separate on solve rate. Good task.')
} else {
  console.log('  VERDICT: WEAK - some separation, but under 30 points. More seeds would tell')
  console.log('  you whether it is real or noise.')
}
console.log('')
console.log('  records: ' + join(out, 'runs.jsonl'))
