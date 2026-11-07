/**
 * f18-replication.mjs - does a cheap model really solve a hard task the pricier ones almost never do?
 *
 * F18 was taken from one task and one seed, and this project has retracted two claims taken from
 * single observations. The claim under test:
 *
 *   on lh-ledger-replay, DeepSeek V4.1 Flash solves at a materially higher rate than
 *   Claude Sonnet 5.5 and Claude Haiku 4.5 at a fraction of the cost per run.
 *
 * Everything is computed per RUN as well as per ARM. F18's original "3/7" counted ARMS, which
 * treats ten configurations of the same model as ten independent draws; the per-run denominator is
 * the honest one and gives a weaker effect. Both are reported so the difference is visible.
 *
 * Runs are excluded only by tools/exclusions.mjs (pre-registration rule 9).
 *
 * Usage: node tools/f18-replication.mjs [--json analysis/f18.json]
 */
import { readFileSync, existsSync } from 'node:fs'
import { exclusionVerdict } from './exclusions.mjs'
import { PRICES } from './prices.mjs'
import { indexByRun } from './attribute.mjs'

const SOURCES = [
  { model: 'deepseek-flash', label: 'DeepSeek V4.1 Flash', tier: 'cheap', dirs: ['results/f18-deepseek', 'results/check-lh-ledger-replay'], gws: ['results/f18-deepseek-gateway.jsonl', 'results/gateway.jsonl'] },
  { model: 'claude-sonnet-5.5', label: 'Claude Sonnet 5.5', tier: 'frontier', dirs: ['results/f18-sonnet'], gws: ['results/f18-sonnet-gateway.jsonl', 'results/anthropic-gateway.jsonl'] },
  { model: 'claude-haiku-4.5', label: 'Claude Haiku 4.5', tier: 'budget', dirs: ['results/f18-haiku', 'results/haiku-hard-probe'], gws: ['results/f18-haiku-gateway.jsonl', 'results/anthropic-gateway.jsonl'] },
  { model: 'gpt-6-luna', label: 'gpt-6-luna', tier: 'cheap', dirs: ['results/f18-luna'], gws: ['results/f18-luna-gateway.jsonl'] },
]

/** Exact one-sided Fisher. Both margins fixed. */
function fisherOneSided(a, b, c, d) {
  const lgamma = (z) => { const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let x = z, y = z, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp); let ser = 1.000000000190015; for (let j = 0; j < 6; j++) ser += g[j] / ++y; return -tmp + Math.log(2.5066282746310005 * ser / x) }
  const lfact = (n) => lgamma(n + 1)
  const lchoose = (n, k) => lfact(n) - lfact(k) - lfact(n - k)
  const n = a + b + c + d, r1 = a + b, c1 = a + c
  const pOf = (x) => Math.exp(lchoose(r1, x) + lchoose(n - r1, c1 - x) - lchoose(n, c1))
  let p = 0
  for (let x = a; x <= Math.min(r1, c1); x++) p += pOf(x)
  return Math.min(1, p)
}

const out = { generated: new Date().toISOString(), models: [] }
console.log('F18 REPLICATION - lh-ledger-replay, hard-task batch')
console.log('Exclusions: pre-registration rule 9 only (tools/exclusions.mjs).\n')

for (const src of SOURCES) {
  let runs = []
  for (const d of src.dirs) {
    const p = d + '/runs.jsonl'
    if (existsSync(p)) runs = runs.concat(readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean).map((r) => ({ ...r, _dir: d })))
  }
  if (!runs.length) { console.log(src.label + ':  no runs yet'); continue }
  // A cell is (dir, task, arm, seed): the two DeepSeek sources are different matrices.
  const seen = new Set()
  const primary = []
  for (const r of runs) {
    const k = [r._dir, r.task, r.arm, r.seed].join('|')
    if (seen.has(k)) continue
    seen.add(k); primary.push(r)
  }
  // Load this source's gateway logs FIRST: rule 9's second half needs the status codes.
  const usage = new Map()
  for (const g of src.gws) {
    if (!existsSync(g)) continue
    const recs = readFileSync(g, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
    const { byRun } = indexByRun(recs)
    for (const [k, v] of byRun) if (!usage.has(k)) usage.set(k, v)
  }
  /** Rule 9, both halves, from the one definition. */
  const verdictOf = (r) => exclusionVerdict(r, usage.get(r.runId) ?? [])
  const analysed = primary.filter((r) => !verdictOf(r).excluded)
  const ex = primary.length - analysed.length

  const arms = [...new Set(analysed.map((r) => r.arm))].sort()
  const armsSolved = arms.filter((a) => analysed.some((r) => r.arm === a && r.solved)).length

  const card = PRICES[src.model]
  let costSum = 0, costN = 0
  for (const r of analysed) {
    const rs = usage.get(r.runId)
    if (!rs) continue
    let c = 0
    for (const q of rs) {
      const u = q.usage ?? {}
      const h = u.cacheHitTokens ?? 0, m = u.cacheMissTokens ?? Math.max(0, (u.inputTokens ?? 0) - h), cr = u.cacheCreationTokens ?? 0
      // m, not max(0, m - cr): the token buckets are disjoint. See tools/prices.mjs costOf.
      c += (m / 1e6) * card.miss + (cr / 1e6) * (card.write ?? card.miss) + (h / 1e6) * card.hit + ((u.outputTokens ?? 0) / 1e6) * card.out
    }
    costSum += c; costN++
  }
  const rec = { model: src.model, label: src.label, tier: src.tier, runs: primary.length, excluded: ex, analysed: analysed.length,
    solved: analysed.filter((r) => r.solved).length, arms: arms.length, armsSolved, costPerRun: costN ? costSum / costN : null }
  rec.solveRate = rec.solved / rec.analysed
  out.models.push(rec)
  console.log('  ' + src.label.padEnd(22) + 'runs ' + String(rec.analysed).padStart(4) + ' (excl ' + String(ex).padStart(3) + ')   solved ' +
    String(rec.solved).padStart(3) + ' = ' + (rec.solveRate * 100).toFixed(1).padStart(5) + '%   arms solved ' + rec.armsSolved + '/' + rec.arms +
    '   $/run ' + (rec.costPerRun == null ? 'n/a' : '$' + rec.costPerRun.toFixed(4)))
}

console.log('\n--- Fisher exact, one-sided, per RUN (the honest denominator) ---')
const base = out.models.find((m) => m.model === 'deepseek-flash')
if (base) {
  for (const m of out.models) {
    if (m.model === base.model) continue
    const p = fisherOneSided(base.solved, base.analysed - base.solved, m.solved, m.analysed - m.solved)
    console.log('  ' + base.label + ' (' + base.solved + '/' + base.analysed + ') vs ' + m.label.padEnd(20) + ' (' + m.solved + '/' + m.analysed + ')   p = ' + p.toFixed(4) + (p < 0.05 ? '  *' : '  n.s.'))
  }
  console.log('\n--- per ARM, the denominator F18 originally used ---')
  for (const m of out.models) {
    if (m.model === base.model) continue
    const p = fisherOneSided(base.armsSolved, base.arms - base.armsSolved, m.armsSolved, m.arms - m.armsSolved)
    console.log('  ' + base.label + ' (' + base.armsSolved + '/' + base.arms + ' arms) vs ' + m.label.padEnd(20) + ' (' + m.armsSolved + '/' + m.arms + ')   p = ' + p.toFixed(4) + (p < 0.05 ? '  *' : '  n.s.'))
  }
}

console.log('\nNOTE. Sessions take minutes each on this task and run concurrently; a run that was cut short')
console.log('by a machine problem is not a model failure, so every run is checked against rule 9 first.')
const ji = process.argv.indexOf('--json')
if (ji >= 0) {
  const { writeFileSync, mkdirSync } = await import('node:fs')
  const p = process.argv[ji + 1] ?? 'analysis/f18.json'
  mkdirSync(p.split(/[\\/]/).slice(0, -1).join('/') || '.', { recursive: true })
  writeFileSync(p, JSON.stringify(out, null, 1))
  console.log('\nwrote ' + p)
}
