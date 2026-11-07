/**
 * ranking-adjusted.mjs - do section 3.4's ranking statistics survive the execution-order confound?
 *
 * WHY THIS EXISTS. Every ranking statistic in PAPER.md section 3.4 (the adjacent-step tie fraction,
 * the A1b median Spearman rho) is computed on RAW costs, under a single execution order that is
 * IDENTICAL in all six matrices and therefore not a randomisation (limitation 8). The same fixed
 * permutation contributes a different arm-specific offset in each model, which is a ready-made
 * manufacturer of cross-model rank disagreement - the very thing section 3.4 measures. No
 * position-adjusted ranking exists on disk.
 *
 * WHAT THIS TOOL DOES. It estimates each model's position step function exactly as the paper's
 * adjusted table does (tools/position-adjust.mjs's pairedBlocks/adjustedFit), uses it to replace each
 * record's cost with its POSITION-OFFSET cost, and then runs the SAME statistics through the SAME
 * estimators (tools/cost-panel.mjs's pairedDiffs/summarise, tools/stats.mjs's bootstrapTaskMean).
 * Nothing about the ranking rules is re-implemented: only the cost column changes. The raw column is
 * computed by the same code on the unadjusted panel, so the comparison is like-for-like, and a test
 * pins the raw column to the filed A8/A1b numbers.
 *
 * Usage: node tools/ranking-adjusted.mjs [--iters 20000] [--seed 12345] [--json <path>]
 */
import { buildPanel, pairedDiffs, summarise, mean, MODELS, SUITES } from './cost-panel.mjs'
import { bootstrapTaskMean } from './stats.mjs'
import { pairedBlocks, adjustedFit, NATIVE_ARM, PTC_ARM } from './position-adjust.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export const CLEAN_ARMS = ['dsh:native', 'dsh:native-opt', 'dsh:ptc', 'dsh:ptc-opt', 'opencode', 'goose', 'cline', 'openhands']

/** The fitted step function of one model, as f(position); the reference position is 0. */
export function stepFunction (panel, model) {
  const rows = panel.filter((r) => r.model === model)
  const blocks = pairedBlocks(rows)
  const fit = adjustedFit(blocks, { scale: 'log' })
  const f = (p) => { const j = fit.cols.indexOf(Number(p)); return j < 0 ? 0 : fit.beta[j + 1] }
  return { f, cols: fit.cols, pairs: fit.pairs, n: fit.n }
}

/** The panel with costBilled replaced by its position-offset value, exp(log(c) - f(position)). */
export function offsetPanel (panel, model) {
  const { f } = stepFunction(panel, model)
  return panel.map((r) => r.model === model
    ? { ...r, costBilled: Math.exp(Math.log(Math.max(r.costBilled, 1e-12)) - f(r.position ?? 0)) }
    : r)
}

/** Spearman over two arm tables in cost order - the A1b definition. */
function spearmanTables (a, b) {
  const shared = a.filter((x) => b.some((y) => y.arm === x.arm)).map((x) => x.arm)
  if (shared.length < 3) return null
  const ra = shared.map((arm) => a.findIndex((x) => x.arm === arm))
  const rb = shared.map((arm) => b.findIndex((x) => x.arm === arm))
  const n = shared.length
  const d2 = ra.reduce((s, v, i) => s + (v - rb[i]) ** 2, 0)
  return 1 - (6 * d2) / (n * (n * n - 1))
}

/** The A8 statistic: adjacent pairs in cost order, distinct when the paired CI excludes zero. */
export function tieFraction (panel, models, { iters, seed }) {
  let pairs = 0, ties = 0
  const details = []
  for (const m of models) {
    const t = summarise(panel).filter((r) => r.model === m).sort((a, b) => a.billed - b.billed)
    if (t.length < 2) continue
    for (let i = 0; i < t.length - 1; i++) {
      const a = t[i], b = t[i + 1]
      const d = pairedDiffs(panel, m, a.arm, b.arm)
      if (!d.size) continue
      const ci = bootstrapTaskMean(d, { iters, seed })
      const distinct = ci.lo > 0 || ci.hi < 0
      pairs++; if (!distinct) ties++
      details.push({ model: m, cheaper: a.arm, dearer: b.arm, distinct })
    }
  }
  return { pairs, ties, fraction: pairs ? ties / pairs : null, details }
}

/** The A1b statistic: median Spearman rho across model pairs on the 8 clean arms. */
export function medianRho (panel, models) {
  const tables = {}
  for (const m of models) {
    const t = summarise(panel).filter((r) => r.model === m && CLEAN_ARMS.includes(r.arm)).sort((a, b) => a.billed - b.billed)
    if (t.length === CLEAN_ARMS.length) tables[m] = t
  }
  const keys = Object.keys(tables)
  const corr = []
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const s = spearmanTables(tables[keys[i]], tables[keys[j]])
    if (s != null) corr.push({ a: keys[i], b: keys[j], rho: s })
  }
  const rhos = corr.map((c) => c.rho).sort((x, y) => x - y)
  const med = rhos.length ? (rhos.length % 2 ? rhos[(rhos.length - 1) / 2] : (rhos[rhos.length / 2 - 1] + rhos[rhos.length / 2]) / 2) : null
  return { medianRho: med, pairs: corr.length, correlations: corr }
}

export function analyse (suite, { iters = 20000, seed = 12345 } = {}) {
  const datasets = suite === 'batchb' ? SUITES.batchb : SUITES.batch1
  const { panel } = buildPanel({ datasets })
  const models = Object.keys(MODELS).filter((m) => panel.some((r) => r.model === m))
  const stepFunctions = {}
  for (const m of models) stepFunctions[m] = stepFunction(panel, m)
  let adjusted = panel
  for (const m of models) adjusted = offsetPanel(adjusted, m)
  const raw = { ties: tieFraction(panel, models, { iters, seed }), rho: medianRho(panel, models) }
  const adj = { ties: tieFraction(adjusted, models, { iters, seed }), rho: medianRho(adjusted, models) }
  return { suite, iters, seed, models, stepFunctions: Object.fromEntries(Object.entries(stepFunctions).map(([m, s]) => [m, { cols: s.cols, pairs: s.pairs, n: s.n }])), raw, adjusted: adj }
}

if (process.argv[1] && process.argv[1].endsWith('ranking-adjusted.mjs')) {
  const argv = process.argv.slice(2)
  const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d)
  const iters = Number(arg('--iters', 20000))
  const seed = Number(arg('--seed', 12345))
  console.log('RANKING STATISTICS ON POSITION-OFFSET COSTS - section 3.4 sensitivity')
  console.log('  method: each model\'s step function fitted as in tools/position-adjust.mjs, applied to')
  console.log('  every arm; the SAME A8/A1b statistics then run on the offset costs at B = ' + iters.toLocaleString() + '.')
  const out = { generated: new Date().toISOString(), iters, seed, suites: {} }
  for (const suite of ['batch1', 'batchb']) {
    const r = analyse(suite, { iters, seed })
    out.suites[suite] = r
    console.log('')
    console.log('  ' + suite + '  (' + r.models.length + ' models)')
    console.log('    tie fraction   raw ' + r.raw.ties.ties + '/' + r.raw.ties.pairs + ' = ' + (r.raw.ties.fraction * 100).toFixed(1) + '%' +
      '   ->  adjusted ' + r.adjusted.ties.ties + '/' + r.adjusted.ties.pairs + ' = ' + (r.adjusted.ties.fraction * 100).toFixed(1) + '%')
    console.log('    median rho     raw ' + (r.raw.rho.medianRho == null ? 'n/a' : r.raw.rho.medianRho.toFixed(3)) +
      '   ->  adjusted ' + (r.adjusted.rho.medianRho == null ? 'n/a' : r.adjusted.rho.medianRho.toFixed(3)))
  }
  const ji = argv.indexOf('--json')
  if (ji >= 0) {
    const p = argv[ji + 1] ?? 'analysis/ranking-adjusted.json'
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, JSON.stringify(out, null, 1))
    console.log('')
    console.log('  wrote ' + p)
  }
}
