/**
 * quality-guard.mjs - the solve-rate guard the code-mode cost contrast never had.
 *
 * WHY THIS EXISTS. The paper's central contrast is dsh:ptc against dsh:native on cost_billed per
 * cell. A per-cell cost difference is a cost difference at equal quality only when the two arms solve
 * the same cells. The filed solve-rate family (panel section A4solve) tests the two TERSE contrasts
 * and never dsh:ptc against dsh:native, so on batch 1 the headline contrast carried no quality check
 * at all - while tasks-b/PLAN.md section 7 ordered exactly this guard for the Anthropic extension.
 * On batch-1 Haiku the guard matters: dsh:ptc solves 46 of 62 cells against native's 60.
 *
 * WHAT IT REPORTS, per model and suite, using the study's own estimators:
 *   - solved cells per arm, the discordant (task, seed) pairs and the exact two-sided McNemar p
 *     (hard-analysis.mjs mcnemarExact);
 *   - mean cost per cell and cost per solved cell (sum of cost / solved cells) per arm;
 *   - the paired contrast RESTRICTED to (task, seed) cells both arms solved: per task, the mean over
 *     those seeds of (ptc - native), task-clustered percentile bootstrap at the study default
 *     (B = 200,000, seed 12345, tools/stats.mjs), expressed as a percentage of native's mean over the
 *     same cells - the A2 convention applied to the equal-quality subset;
 *   - mean model requests per cell per arm (the quantity H3 counts).
 *
 * Panels come from tools/cost-panel.mjs buildPanel, the same function every filed panel used.
 *
 * Usage: node tools/quality-guard.mjs [--json analysis/quality-guard-2026-10-10.json]
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { buildPanel, SUITES, mean } from './cost-panel.mjs'
import { bootstrapTaskMean } from './stats.mjs'
import { mcnemarExact } from './hard-analysis.mjs'

export const ARMS = { base: 'dsh:native', treat: 'dsh:ptc' }

/** One model's guard from its panel rows. Exported so a test can feed it constructed rows. */
export function guardModel (rows, { iters = 200000, seed = 12345 } = {}) {
  const cells = new Map()   // task|seed -> { native, ptc }
  const per = { [ARMS.base]: [], [ARMS.treat]: [] }
  for (const r of rows) {
    if (r.arm !== ARMS.base && r.arm !== ARMS.treat) continue
    per[r.arm].push(r)
    const k = r.task + '|' + r.seed
    const e = cells.get(k) ?? { task: r.task }
    e[r.arm] = r
    cells.set(k, e)
  }
  const arm = (a) => {
    const xs = per[a]
    const solved = xs.filter((r) => r.solved)
    const total = xs.reduce((s, r) => s + r.costBilled, 0)
    return {
      cells: xs.length,
      solved: solved.length,
      costPerCell: xs.length ? total / xs.length : null,
      costPerSolved: solved.length ? total / solved.length : null,
      requestsPerCell: mean(xs.map((r) => r.requests)),
    }
  }
  let nativeOnly = 0, ptcOnly = 0
  const both = new Map()     // task -> [ptc - native] over seeds both solved
  const bothNative = []
  for (const e of cells.values()) {
    const a = e[ARMS.base], b = e[ARMS.treat]
    if (!a || !b) continue
    if (a.solved && !b.solved) nativeOnly++
    if (!a.solved && b.solved) ptcOnly++
    if (a.solved && b.solved) {
      if (!both.has(e.task)) both.set(e.task, [])
      both.get(e.task).push(b.costBilled - a.costBilled)
      bothNative.push(a.costBilled)
    }
  }
  const diffs = new Map([...both].map(([t, ds]) => [t, mean(ds)]))
  const ci = bootstrapTaskMean(diffs, { iters, seed })
  const nativeMean = mean(bothNative)
  const d = mean([...diffs.values()])
  const base = arm(ARMS.base), treat = arm(ARMS.treat)
  return {
    native: base,
    ptc: treat,
    mcnemar: mcnemarExact(nativeOnly, ptcOnly),
    perCellPct: (treat.costPerCell / base.costPerCell - 1) * 100,
    perSolvedPct: (treat.costPerSolved / base.costPerSolved - 1) * 100,
    bothSolved: {
      cells: bothNative.length,
      tasks: diffs.size,
      pct: (d / nativeMean) * 100,
      ciLoPct: (ci.lo / nativeMean) * 100,
      ciHiPct: (ci.hi / nativeMean) * 100,
      excludesZero: ci.lo > 0 || ci.hi < 0,
      iters,
      seed,
    },
  }
}

export function qualityGuard ({ iters = 200000, seed = 12345 } = {}) {
  const out = {}
  for (const suite of ['batch1', 'batchb']) {
    const { panel } = buildPanel({ datasets: SUITES[suite] })
    const models = [...new Set(panel.map((r) => r.model))]
    out[suite] = models.map((model) => ({ model, ...guardModel(panel.filter((r) => r.model === model), { iters, seed }) }))
  }
  return out
}

if (process.argv[1] && process.argv[1].endsWith('quality-guard.mjs')) {
  const argv = process.argv.slice(2)
  const jsonPath = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null
  const suites = qualityGuard()
  const f = (v, d = 1) => (v >= 0 ? '+' : '') + v.toFixed(d)
  for (const [suite, rows] of Object.entries(suites)) {
    console.log('\n' + suite + '  (dsh:ptc vs dsh:native)')
    console.log('model'.padEnd(20) + 'solved n/p'.padEnd(14) + 'McNemar'.padEnd(18) + 'per cell'.padEnd(10) + 'per solved'.padEnd(12) + 'both-solved contrast')
    for (const r of rows) {
      console.log(r.model.padEnd(20) +
        (r.native.solved + '/' + r.ptc.solved + ' of ' + r.native.cells).padEnd(14) +
        (r.mcnemar.n01 ?? 0) + ':' + (r.mcnemar.n10 ?? 0) + ' p=' + r.mcnemar.p.toPrecision(3).padEnd(10) +
        (f(r.perCellPct) + '%').padEnd(10) + (f(r.perSolvedPct) + '%').padEnd(12) +
        f(r.bothSolved.pct, 2) + '% [' + f(r.bothSolved.ciLoPct, 2) + ', ' + f(r.bothSolved.ciHiPct, 2) + '] over ' + r.bothSolved.cells + ' cells')
    }
  }
  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true })
    writeFileSync(jsonPath, JSON.stringify({ generated: new Date().toISOString(), tool: 'tools/quality-guard.mjs', arms: ARMS, suites }, null, 2) + '\n')
    console.log('\nwrote ' + jsonPath)
  }
}
