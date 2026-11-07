#!/usr/bin/env node
/**
 * analyze-results — join run records with captured usage and produce the §7 tables.
 *
 * Implements the pre-registered analysis in notes/records/TEST-PROTOCOL.md: paired comparisons
 * across task blocks, exact Wilcoxon signed-rank, bootstrap CI on the median
 * paired difference, and a quality guard that refuses to interpret a cost
 * comparison whose solve rates have diverged.
 *
 *   node tools/analyze-results.mjs --runs results/runs.jsonl --usage results/usage.jsonl
 */
import { readFileSync, existsSync } from 'node:fs'
import { cardFor } from './prices.mjs'
import { makeRng } from './rng.mjs'

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const runsPath = opt('--runs', 'results/runs.jsonl')
// The gateway writes gateway.jsonl. Defaulting to usage.jsonl silently produced
// "0 usage records" and a table of zeros.
const usagePath = opt('--usage', 'results/gateway.jsonl')

// Published rate card, USD per million tokens: tools/prices.mjs (single copy, corrected
// 2026-09-30 - this file used to carry the retracted DeepSeek card).
// cardFor(required) throws on an unknown model. Falling back to DeepSeek's card would silently
// price any other provider's tokens at 0.15/0.60 - the defect that undercounted an Anthropic
// matrix 6.79x. See tools/prices.test.mjs.
const priceFor = (model) => cardFor(model, { required: true })

const readJsonl = (p) => !existsSync(p) ? [] : readFileSync(p, 'utf8').split('\n').filter(Boolean)
  .map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)

const runs = readJsonl(runsPath)
const usage = readJsonl(usagePath)
if (!runs.length) { console.error('no runs in ' + runsPath); process.exit(1) }

// ---- join usage to runs ------------------------------------------------------
const byRun = new Map()
for (const u of usage) {
  if (!u.usage || String(u.url ?? '').includes('/models')) continue
  if (!byRun.has(u.runId)) byRun.set(u.runId, [])
  byRun.get(u.runId).push(u)
}

function costOf(run) {
  const reqs = byRun.get(run.runId) ?? []
  let coldUsd = 0, billedUsd = 0, outTok = 0, hit = 0, miss = 0, requests = reqs.length
  const model = reqs.find(r => r.model)?.model ?? 'deepseek-flash'
  const pr = priceFor(model)
  for (const r of reqs) {
    const u = r.usage
    const inTok = u.inputTokens ?? 0
    const h = u.cacheHitTokens ?? 0
    const m = u.cacheMissTokens ?? (inTok - h)
    hit += h; miss += Math.max(0, m); outTok += u.outputTokens ?? 0
    coldUsd += (inTok / 1e6) * pr.miss
    billedUsd += (Math.max(0, m) / 1e6) * pr.miss + (h / 1e6) * pr.hit
  }
  return { coldUsd, billedUsd, inTok: hit + miss, hit, miss, outTok, requests, model,
           hitRate: hit + miss > 0 ? hit / (hit + miss) : null }
}

for (const r of runs) Object.assign(r, costOf(r))

// ---- per-arm aggregates ------------------------------------------------------
// 'arm' since the runner moved from DSH presets to (presentation x policy) arms.
const conds = [...new Set(runs.map(r => r.arm))]
const tasks = [...new Set(runs.map(r => r.task))]
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const wilson = (k, n) => { if (!n) return [null, null]; const z = 1.96, p = k / n
  const d = 1 + z * z / n, c = p + z * z / (2 * n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
  return [(c - h) / d, (c + h) / d] }

console.log('CONDITIONS  (' + runs.length + ' runs, ' + tasks.length + ' tasks, ' + usage.length + ' usage records)')
console.log('')
console.log('  ' + 'condition'.padEnd(16) + 'runs'.padStart(5) + 'solved'.padStart(8) + 'solve%'.padStart(8) +
  'cost/solved'.padStart(13) + 'cost cold'.padStart(11) + 'hit%'.padStart(7) + 'steps'.padStart(7) + 'inTok'.padStart(10) + 'outTok'.padStart(9))
for (const c of conds) {
  const rs = runs.filter(r => r.arm === c)
  const solved = rs.filter(r => r.solved)
  const [lo, hi] = wilson(solved.length, rs.length)
  const billed = solved.reduce((a, r) => a + r.billedUsd, 0) / (solved.length || 1)
  const cold = solved.reduce((a, r) => a + r.coldUsd, 0) / (solved.length || 1)
  const hr = rs.map(r => r.hitRate).filter(v => v != null)
  console.log('  ' + c.padEnd(16) + String(rs.length).padStart(5) +
    String(solved.length).padStart(8) + ((solved.length / rs.length) * 100).toFixed(0).padStart(7) + '%' +
    ('$' + billed.toFixed(4)).padStart(13) + ('$' + cold.toFixed(4)).padStart(11) +
    ((median(hr) ?? 0) * 100).toFixed(1).padStart(6) + '%' +
    median(rs.map(r => r.requests)).toFixed(0).padStart(7) +
    median(rs.map(r => r.inTok)).toFixed(0).padStart(10) +
    median(rs.map(r => r.outTok)).toFixed(0).padStart(9))
  console.log('  ' + ''.padEnd(16) + 'solve rate 95% CI: ' + ((lo ?? 0) * 100).toFixed(0) + '-' + ((hi ?? 0) * 100).toFixed(0) + '%')
}

// ---- exact Wilcoxon signed-rank over task blocks -----------------------------
function wilcoxon(diffs) {
  const d = diffs.filter(x => x !== 0)
  const n = d.length
  if (!n) return { n: 0, p: 1, W: 0 }
  const abs = d.map(Math.abs)
  const sorted = [...abs].sort((a, b) => a - b)
  const rankOf = (v) => { const i = sorted.indexOf(v); const j = sorted.lastIndexOf(v)
    return (i + j) / 2 + 1 }                              // average rank for ties
  const W = d.reduce((a, x, i) => a + (x > 0 ? rankOf(abs[i]) : 0), 0)
  const total = n * (n + 1) / 2
  const stat = Math.min(W, total - W)
  let count = 0
  for (let mask = 0; mask < (1 << n); mask++) {
    let s = 0
    for (let i = 0; i < n; i++) if (mask & (1 << i)) s += i + 1
    if (Math.min(s, total - s) <= stat) count++
  }
  return { n, W, p: count / (1 << n) }
}
function bootstrapCI(diffs, iters = 10000) {
  const n = diffs.length
  if (!n) return [null, null]
  const meds = []
  // tools/rng.mjs: the LCG that used to live here multiplied past 2^53 in doubles, so the low
  // bits - the only bits an LCG's randomness lives in - were rounded away before the modulus.
  const rnd = makeRng(12345)
  for (let k = 0; k < iters; k++) {
    const sample = []
    for (let i = 0; i < n; i++) sample.push(diffs[Math.floor(rnd() * n)])
    meds.push(median(sample))
  }
  meds.sort((a, b) => a - b)
  return [meds[Math.floor(iters * 0.025)], meds[Math.floor(iters * 0.975)]]
}

const metric = (r, m) => (m === 'cost' ? r.billedUsd : m === 'cold' ? r.coldUsd : m === 'steps' ? r.requests
  : m === 'inTok' ? r.inTok : m === 'outTok' ? r.outTok : m === 'hitRate' ? r.hitRate : null)

function compare(a, b, m) {
  const diffs = []
  for (const t of tasks) {
    const A = runs.filter(r => r.task === t && r.arm === a).map(r => metric(r, m)).filter(v => v != null)
    const B = runs.filter(r => r.task === t && r.arm === b).map(r => metric(r, m)).filter(v => v != null)
    if (A.length && B.length) diffs.push(median(A) - median(B))
  }
  const w = wilcoxon(diffs)
  const ci = bootstrapCI(diffs)
  return { diffs, n: w.n, p: w.p, med: median(diffs), ci }
}

const PAIRS = [
  ['dsh:ptc', 'dsh:native'],          // presentation, shipped policy
  ['dsh:ptc-opt', 'dsh:native-opt'],  // presentation, optimized policy
  ['dsh:ptc-opt', 'dsh:ptc'],         // policy, under PTC presentation
  ['dsh:ptc-opt', 'opencode'],        // our best vs an external harness
]
const METRICS = [['cost', 'billed $/run'], ['cold', 'cold $/run'], ['steps', 'model requests'], ['inTok', 'input tokens'], ['outTok', 'output tokens']]
console.log('\nPAIRED COMPARISONS ACROSS TASK BLOCKS  (median of per-task medians, exact Wilcoxon)')
console.log('')
console.log('  ' + 'A vs B'.padEnd(30) + 'metric'.padEnd(16) + 'median diff'.padStart(13) + 'boot 95% CI'.padStart(24) + 'p'.padStart(9) + 'n'.padStart(4))
for (const [a, b] of PAIRS) {
  if (!conds.includes(a) || !conds.includes(b)) continue
  for (const [m, label] of METRICS) {
    const r = compare(a, b, m)
    if (!r.n) continue
    const ci = '[' + (r.ci[0] ?? 0).toFixed(4) + ', ' + (r.ci[1] ?? 0).toFixed(4) + ']'
    console.log('  ' + (a + ' - ' + b).padEnd(30) + label.padEnd(16) +
      r.med.toFixed(4).padStart(13) + ci.padStart(24) + r.p.toFixed(4).padStart(9) + String(r.n).padStart(4))
  }
}

// ---- quality guard -----------------------------------------------------------
console.log('\nQUALITY GUARD')
let blocked = false
for (const [a, b] of PAIRS) {
  if (!conds.includes(a) || !conds.includes(b)) continue
  const sa = runs.filter(r => r.arm === a), sb = runs.filter(r => r.arm === b)
  const ra = sa.filter(r => r.solved).length / sa.length, rb = sb.filter(r => r.solved).length / sb.length
  const diff = Math.abs(ra - rb)
  const flag = diff > 0.15 ? '  ** solve rates diverge by ' + (diff * 100).toFixed(0) + 'pp - cost comparison NOT interpretable' : ''
  if (flag) blocked = true
  console.log('  ' + (a + ' vs ' + b).padEnd(30) + ((ra * 100).toFixed(0) + '% vs ' + (rb * 100).toFixed(0) + '%').padEnd(14) + flag)
}
console.log(blocked
  ? '\n  One or more comparisons are not interpretable. Report them as such.'
  : '\n  Solve rates are within 15pp. Cost comparisons are interpretable as reported.')
if (!usage.length) console.log('\n  NOTE: no usage records found - cost columns are zero. Run with the proxy enabled.')
