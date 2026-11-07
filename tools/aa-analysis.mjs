/**
 * aa-analysis.mjs - the noise floor from the corrected A/A placebo (notes/plans/AA-PLACEBO-PLAN.md).
 *
 * The two passes are registered as two datasets at runtime (the shared registry is not edited: this
 * is a one-off measurement, not a study population), the panel is built by the study's own
 * tools/cost-panel.mjs, and the per-task difference is computed by the study's own pairedDiffs and
 * bootstrapped by the study's own stats.mjs. No estimator is re-implemented here.
 *
 * Usage: node tools/aa-analysis.mjs [--json <path>] [--iters 200000] [--seed 12345]
 */
import { DATASETS, buildPanel, pairedDiffs, summarise, mean } from './cost-panel.mjs'
import { bootstrapTaskMean } from './stats.mjs'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'

export const PASS_DIRS = {
  'aa-pass1': 'results/aa-ds-full/pass1/runs.jsonl',
  'aa-pass2': 'results/aa-ds-full/pass2/runs.jsonl',
}
export const AA_MODEL = 'deepseek-flash'
export const ARM = 'dsh:native'
export const ARM_P2 = 'dsh:native-p2'

/** Register the two passes if absent. Mutating the exported registry is how cost-panel.mjs itself
 *  adds its suites; this tool does it at run time so the study's registry is untouched. */
export function registerPasses () {
  for (const [id, runs] of Object.entries(PASS_DIRS)) {
    if (!DATASETS.some((d) => d.id === id)) {
      DATASETS.push({ id, suite: 'aa', model: AA_MODEL, runs, note: 'A/A placebo pass (tools/aa-plans.mjs)' })
    }
  }
}

const METRICS = {
  billed: (r) => r.costBilled,
  totalTokens: (r) => r.fresh + r.created + r.hit + r.out,
  inputTokens: (r) => r.fresh + r.created + r.hit,
  outputTokens: (r) => r.out,
}

const sd = (xs) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) }

export function analyse ({ iters = 200000, seed = 12345 } = {}) {
  for (const [id, runs] of Object.entries(PASS_DIRS)) {
    if (!existsSync(runs)) throw new Error('missing ' + runs + ' - the ' + id + ' pass has not been collected')
  }
  registerPasses()
  const { panel, meta, missing } = buildPanel({ datasets: Object.keys(PASS_DIRS) })
  if (missing.length) throw new Error('no panel rows for ' + missing.join(', '))
  // One pass, one arm label: pass 2 is tagged so pairedDiffs can pair it against pass 1.
  const combined = panel.map((r) => ({ ...r, arm: r.dataset === 'aa-pass2' && r.arm === ARM ? ARM_P2 : r.arm }))
  const out = {
    generated: new Date().toISOString(),
    plan: 'AA-PLACEBO-PLAN.md',
    design: 'repeated baseline: one arm, 31 tasks, 2 seeds, 2 passes, DeepSeek only',
    method: 'paired by task, pass 2 minus pass 1 (seeds averaged within each pass), task-cluster percentile bootstrap',
    iters, seed,
    passes: {},
    metrics: {},
  }
  for (const [id] of Object.entries(PASS_DIRS)) {
    const m = meta[id]
    const rows = panel.filter((r) => r.dataset === id)
    const s = summarise(rows).find((x) => x.arm === ARM) ?? null
    out.passes[id] = {
      runs: m?.rows ?? null, cells: m?.cells ?? null, excluded: m?.excluded ?? null,
      statusExcluded: m?.statusExcluded ?? null,
      solved: s ? Math.round(s.solveRate * s.n) : null, n: s?.n ?? null,
      solveRate: s ? s.solveRate : null,
      meanBilled: s ? s.billed : null,
      meanTotalTokens: s ? mean(rows.filter((r) => r.arm === ARM).map((r) => r.fresh + r.created + r.hit + r.out)) : null,
    }
    // The passes ran back to back with byte-identical requests on a provider that caches
    // automatically, so pass 1 can warm pass 2's cache. The token-weighted hit share per pass is what
    // shows whether it did; without it the pass difference reads as pure noise.
    const own = rows.filter((r) => r.arm === ARM)
    const tot = (k) => own.reduce((a, r) => a + r[k], 0)
    out.passes[id].freshTokens = tot('fresh')
    out.passes[id].cacheHitShare = tot('hit') / (tot('hit') + tot('fresh') + tot('created'))
  }
  for (const [name, fn] of Object.entries(METRICS)) {
    const p = combined.map((r) => ({ ...r, costBilled: fn(r) }))
    const d = pairedDiffs(p, AA_MODEL, ARM, ARM_P2)
    if (!d.size) throw new Error('no paired tasks for ' + name)
    const ci = bootstrapTaskMean(d, { iters, seed })
    const vals = [...d.values()]
    out.metrics[name] = {
      tasks: d.size, mean: mean(vals), sd: sd(vals), ciLo: ci.lo, ciHi: ci.hi,
      perTask: Object.fromEntries([...d].sort((a, b) => a[0] < b[0] ? -1 : 1)),
    }
  }
  return out
}

if (process.argv[1] && process.argv[1].endsWith('aa-analysis.mjs')) {
  const argv = process.argv.slice(2)
  const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d)
  const iters = Number(arg('--iters', 200000))
  const seed = Number(arg('--seed', 12345))
  const r = analyse({ iters, seed })
  console.log('A/A PLACEBO - the measured noise floor (pass 2 minus pass 1, same arm, same tasks)')
  console.log('  method: ' + r.method + ' at B = ' + iters.toLocaleString() + ', seed ' + seed)
  console.log('')
  console.log('  ' + 'metric'.padEnd(14) + 'mean diff'.padStart(12) + '95% CI'.padStart(26) + 'sd'.padStart(10) + 'tasks'.padStart(7))
  for (const [k, m] of Object.entries(r.metrics)) {
    const f = k === 'billed' ? (x) => '$' + x.toFixed(6) : (x) => x.toFixed(1)
    console.log('  ' + k.padEnd(14) + f(m.mean).padStart(12) +
      ('[' + f(m.ciLo) + ', ' + f(m.ciHi) + ']').padStart(26) + f(m.sd).padStart(10) + String(m.tasks).padStart(7))
  }
  console.log('')
  for (const [id, p] of Object.entries(r.passes)) {
    console.log('  ' + id.padEnd(10) + 'runs ' + p.runs + ' cells ' + p.cells + ' solved ' + p.solved + '/' + p.n +
      ' (' + (p.solveRate * 100).toFixed(1) + '%)  mean $' + p.meanBilled.toFixed(6) +
      '  excluded ' + p.excluded + ' + ' + p.statusExcluded)
  }
  const ji = argv.indexOf('--json')
  if (ji >= 0) {
    const path = argv[ji + 1] ?? 'analysis/aa-placebo-2026-10-10.json'
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(r, null, 1) + String.fromCharCode(10))
    console.log('')
    console.log('  wrote ' + path)
  }
}
