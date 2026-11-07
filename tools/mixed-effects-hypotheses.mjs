/**
 * mixed-effects-hypotheses.mjs - the mixed model the pre-registration files, actually fitted.
 *
 * WHY THIS EXISTS. PRE-REGISTRATION.md files H1 and H3 as
 *
 *     y_ij = b0 + b1*x_ij + u_i + e_ij,   u_i ~ N(0, s_u^2),  i = task
 *
 * and notes/plans/JOURNAL-PLAN.md section 3 names the analysis: "linear mixed-effects with task as a random
 * intercept ... A paired t-test ignores task heterogeneity; a mixed model does not." Until now the
 * executed analysis approximated it two ways, both reported by tools/hypotheses.mjs: a pooled OLS
 * with NO task term (the label the paper quotes) and a within-task demeaned OLS labelled
 * "random-intercept-equivalent". Neither estimates s_u^2, and the pooled one treats repeated runs
 * of one task as independent.
 *
 * This tool fits the filed model with tools/mixed-effects.mjs (REML, one random intercept), reports
 * it BESIDE the existing numbers rather than replacing them, and adds the execution-slot fixed
 * effect that notes/defects/DEFECT-position-confound-2026-10-04.md says is owed to H1-H4. Nothing here changes a
 * pre-registered decision rule: the paper's H1 label still comes from the filed primary
 * specification, and these are the numbers a reviewer will ask for next to it.
 *
 * Usage: node tools/mixed-effects-hypotheses.mjs [--json analysis/mixed-effects-6model-2026-10-04.json]
 */
import { buildPanel, MODELS } from './cost-panel.mjs'
import { fitRandomIntercept } from './mixed-effects.mjs'
import { clusterBootstrap, mean } from './stats.mjs'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '..')
const { panel } = buildPanel()
const models = Object.keys(MODELS).filter((m) => panel.some((r) => r.model === m))
const RATIO = (m) => MODELS[m].card.out / MODELS[m].card.miss
const label = (m) => MODELS[m].label
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 10000) / 10000 : x)

/** Execution slot per (dataset, task, arm, seed), read from the run records that carry it. */
const slots = new Map()
for (const ds of new Set(panel.map((r) => r.dataset))) {
  const p = join(repo, 'results', ds, 'runs.jsonl')
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split(String.fromCharCode(10))) {
    if (!line.trim()) continue
    let r = null
    try { r = JSON.parse(line) } catch { continue }
    if (r.position === undefined || r.position === null) continue
    slots.set(ds + '|' + r.task + '|' + r.arm + '|' + r.seed, r.position)
  }
}
const slotOf = (r) => slots.get(r.dataset + '|' + r.task + '|' + r.arm + '|' + r.seed)

const out = { generated: new Date().toISOString(), tool: 'tools/mixed-effects-hypotheses.mjs', model: 'y = b0 + b1*x + u_task + e (REML random intercept)', sections: {} }
const line = (s = '') => console.log(s)
const ciOf = (b, se) => [b - 1.96 * se, b + 1.96 * se]

// =============================================================================================
// H1 - D_ij = b0 + b1*S_ij + u_i + e_ij            (the filed model, n = model x task cells)
// =============================================================================================
line('='.repeat(92))
line('H1 mixed: D_ij = b0 + b1*S_ij + u_i + e_ij,  u_i ~ N(0, s_u^2) over tasks')
line('='.repeat(92))
const h1 = []
for (const m of models) {
  const card = MODELS[m].card
  const byTask = new Map()
  for (const r of panel) {
    if (r.model !== m || !['dsh:native', 'dsh:ptc'].includes(r.arm)) continue
    const e = byTask.get(r.task) ?? { task: r.task, model: m, native: [], ptc: [], nativeS: [], ptcS: [] }
    const share = (r.out / 1e6) * card.out / r.costBilled
    if (r.arm === 'dsh:native') { e.native.push(r.costBilled); e.nativeS.push(share) } else { e.ptc.push(r.costBilled); e.ptcS.push(share) }
    byTask.set(r.task, e)
  }
  for (const [, e] of byTask) {
    if (!e.native.length || !e.ptc.length) continue
    h1.push({ task: e.task, model: m, ratio: RATIO(m), D: mean(e.ptc) - mean(e.native), S: (mean(e.ptcS) + mean(e.nativeS)) / 2 })
  }
}
const fitH1 = fitRandomIntercept(h1.map((r) => r.D), h1.map((r) => [r.S]), h1.map((r) => r.task))
const ciH1 = clusterBootstrap(h1, (draw) => fitRandomIntercept(draw.map((r) => r.D), draw.map((r) => [r.S]), draw.map((r) => r.task)).beta[1], { iters: 2000 })
line('  cells                : ' + h1.length + ' (model x task), ' + new Set(h1.map((r) => r.task)).size + ' tasks, ' + models.length + ' models')
line('  b1 (mixed, REML)     : ' + fitH1.beta[1].toFixed(5) + '   model-based 95% CI [' + ciOf(fitH1.beta[1], fitH1.se[1]).map((v) => v.toFixed(5)).join(', ') + ']')
line('  b1 (task-cluster bootstrap 95% CI) [' + ciH1.lo.toFixed(5) + ', ' + ciH1.hi.toFixed(5) + ']   (' + ciH1.iters + ' resamples of tasks)')
line('  variance components  : sigma_u = ' + fitH1.sigmaU.toFixed(5) + '  sigma_e = ' + fitH1.sigmaE.toFixed(5) + '  ICC = ' + fitH1.icc.toFixed(4))
line('  for comparison, as tools/hypotheses.mjs reports them (unchanged):')
line('    pooled OLS  b1 = +0.00467 [-0.00551, +0.01568]   within-task b1 = +0.00060 [-0.01020, +0.01090]')
const h1Pooled = (() => { const xs = h1.map((r) => r.S), ys = h1.map((r) => r.D); const mx = mean(xs), my = mean(ys); let sxy = 0, sxx = 0; for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2 } return sxy / sxx })()
line('    (this tool re-derives the pooled slope from the same rows for the check below: ' + h1Pooled.toFixed(5) + ')')
out.sections.H1 = { n: h1.length, tasks: new Set(h1.map((r) => r.task)).size, b1Mixed: r4(fitH1.beta[1]), seMixed: r4(fitH1.se[1]), ciModel: ciOf(fitH1.beta[1], fitH1.se[1]).map(r4), ciCluster: [r4(ciH1.lo), r4(ciH1.hi)], sigmaU: r4(fitH1.sigmaU), sigmaE: r4(fitH1.sigmaE), icc: r4(fitH1.icc), b1PooledRederived: r4(h1Pooled), iters: ciH1.iters }

// =============================================================================================
// H1 + SLOT. The confound in notes/defects/DEFECT-position-confound-2026-10-04.md is that the ten arms are
// placed by one shuffle shared by every matrix, so arm and slot are correlated. The fixed-effect
// answer is to estimate the mode effect with slot in the model; the reweighted table in PAPER
// section 3.1 is the non-parametric version of the same correction.
// =============================================================================================
line('')
line('='.repeat(92))
line('The mode effect WITH SLOT AS A FIXED EFFECT: cost_billed ~ mode + slot + (1|task), per model')
line('  (D = dsh:ptc - dsh:native, as a percentage of that model\'s native mean; the second column')
line('   is the shipped panel\'s raw differential, the third the slot-reweighted one from PAPER 3.1)')
line('='.repeat(92))
const RAW = { 'glm-5.3-flash': -20.75, 'gpt-6-luna': 1.20, 'deepseek-flash': 0.13, 'claude-sonnet-5.5': 9.51, 'qwen3.8-flash': 30.67, 'claude-haiku-4.5': 53.84 }
const STD = { 'glm-5.3-flash': -10.08, 'gpt-6-luna': 0.75, 'deepseek-flash': -0.33, 'claude-sonnet-5.5': 3.69, 'qwen3.8-flash': 15.77, 'claude-haiku-4.5': 25.41 }
const slotRows = []
for (const m of models) {
  const rows = panel.filter((r) => r.model === m && ['dsh:native', 'dsh:ptc'].includes(r.arm) && slotOf(r) !== undefined)
  const nat = mean(panel.filter((r) => r.model === m && r.arm === 'dsh:native').map((r) => r.costBilled))
  const X = rows.map((r) => { const s = slotOf(r); const row = [r.arm === 'dsh:ptc' ? 1 : 0]; for (let k = 1; k < 10; k++) row.push(s === k ? 1 : 0); return row })
  const fit = fitRandomIntercept(rows.map((r) => r.costBilled), X, rows.map((r) => r.task))
  const pct = fit.beta[1] / nat * 100
  const ci = ciOf(fit.beta[1], fit.se[1]).map((v) => v / nat * 100)
  slotRows.push({ model: m, label: label(m), n: rows.length, pct: r4(pct), ci: ci.map(r4), raw: RAW[m], std: STD[m], sigmaU: r4(fit.sigmaU), sigmaE: r4(fit.sigmaE), icc: r4(fit.icc), singular: fit.singular })
  line('  ' + label(m).padEnd(20) + 'n=' + String(rows.length).padStart(4) + '  slot-adjusted ' + (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%  [' + ci.map((v) => (v >= 0 ? '+' : '') + v.toFixed(2)).join(', ') + ']   raw ' + (RAW[m] >= 0 ? '+' : '') + RAW[m].toFixed(2) + '%   reweighted ' + (STD[m] >= 0 ? '+' : '') + STD[m].toFixed(2) + '%')
}
out.sections.slotAdjustedModeEffect = slotRows

// =============================================================================================
// H3 - steps_ij = b0 + b1*native_ij + u_i + e_ij
// =============================================================================================
line('')
line('='.repeat(92))
line('H3 mixed: requests_ij = b0 + b1*native_ij + u_i + e_ij')
line('='.repeat(92))
const h3 = []
for (const m of models) {
  for (const r of panel.filter((x) => x.model === m && (x.arm === 'dsh:native' || x.arm === 'dsh:ptc'))) {
    h3.push({ task: r.task, y: r.requests, x: r.arm === 'dsh:native' ? 1 : 0 })
  }
}
const fitH3 = fitRandomIntercept(h3.map((r) => r.y), h3.map((r) => [r.x]), h3.map((r) => r.task))
const ciH3 = clusterBootstrap(h3, (draw) => fitRandomIntercept(draw.map((r) => r.y), draw.map((r) => [r.x]), draw.map((r) => r.task)).beta[1], { iters: 2000 })
line('  n = ' + h3.length + ' runs, ' + new Set(h3.map((r) => r.task)).size + ' tasks')
line('  b1 (mixed, REML)   = ' + fitH3.beta[1].toFixed(4) + ' requests   model-based 95% CI [' + ciOf(fitH3.beta[1], fitH3.se[1]).map((v) => v.toFixed(4)).join(', ') + ']')
line('  task-cluster bootstrap 95% CI [' + ciH3.lo.toFixed(4) + ', ' + ciH3.hi.toFixed(4) + ']')
line('  variance components: sigma_u = ' + fitH3.sigmaU.toFixed(4) + '  sigma_e = ' + fitH3.sigmaE.toFixed(4) + '  ICC = ' + fitH3.icc.toFixed(4))
line('  for comparison, as filed and as reported: b1 within-task = +2.228 [+1.234, +3.328]')
out.sections.H3 = { n: h3.length, b1Mixed: r4(fitH3.beta[1]), seMixed: r4(fitH3.se[1]), ciModel: ciOf(fitH3.beta[1], fitH3.se[1]).map(r4), ciCluster: [r4(ciH3.lo), r4(ciH3.hi)], sigmaU: r4(fitH3.sigmaU), sigmaE: r4(fitH3.sigmaE), icc: r4(fitH3.icc), iters: ciH3.iters }

// =============================================================================================
// H4 - the cache coefficient, with a task random intercept
// =============================================================================================
line('')
line('='.repeat(92))
line('H4 mixed: D_ij = b0 + bS*S_ij + bC*C_ij + u_i + e_ij   (cache coefficient with a task intercept)')
line('='.repeat(92))
const h4 = []
for (const m of models) {
  const byTask = new Map()
  for (const r of panel.filter((x) => x.model === m && ['dsh:native', 'dsh:ptc'].includes(x.arm))) {
    const e = byTask.get(r.task) ?? { task: r.task, n: [], p: [] }
    ;(r.arm === 'dsh:native' ? e.n : e.p).push(r)
    byTask.set(r.task, e)
  }
  for (const [, e] of byTask) {
    if (!e.n.length || !e.p.length) continue
    h4.push({
      task: e.task,
      D: mean(e.p.map((r) => r.costBilled)) - mean(e.n.map((r) => r.costBilled)),
      S: (mean(e.p.map((r) => (r.out / 1e6) * MODELS[m].card.out / r.costBilled)) + mean(e.n.map((r) => (r.out / 1e6) * MODELS[m].card.out / r.costBilled))) / 2,
      C: (mean(e.p.map((r) => r.hitRate ?? 0)) + mean(e.n.map((r) => r.hitRate ?? 0))) / 2,
    })
  }
}
const fitH4 = fitRandomIntercept(h4.map((r) => r.D), h4.map((r) => [r.S, r.C]), h4.map((r) => r.task))
const ciH4 = clusterBootstrap(h4, (draw) => fitRandomIntercept(draw.map((r) => r.D), draw.map((r) => [r.S, r.C]), draw.map((r) => r.task)).beta[2], { iters: 2000 })
line('  n = ' + h4.length + ' cells, ' + new Set(h4.map((r) => r.task)).size + ' tasks')
line('  bS (output share)  = ' + fitH4.beta[1].toFixed(5) + '   bC (cache hit rate) = ' + fitH4.beta[2].toFixed(5))
line('  bC model-based 95% CI [' + ciOf(fitH4.beta[2], fitH4.se[2]).map((v) => v.toFixed(5)).join(', ') + ']   task-cluster bootstrap [' + ciH4.lo.toFixed(5) + ', ' + ciH4.hi.toFixed(5) + ']')
line('  variance components: sigma_u = ' + fitH4.sigmaU.toFixed(5) + '  sigma_e = ' + fitH4.sigmaE.toFixed(5) + '  ICC = ' + fitH4.icc.toFixed(4))
line('  as filed and as reported: bC = +0.11157 [+0.06205, +0.17271]  -> REFUTED (a new finding)')
line('  CI contains 0 under the mixed model? ' + (ciH4.lo <= 0 && ciH4.hi >= 0 ? 'yes -> the filed negative rule would be SUPPORTED here' : 'no -> still REFUTED'))
out.sections.H4 = { n: h4.length, bS: r4(fitH4.beta[1]), bC: r4(fitH4.beta[2]), ciModel: ciOf(fitH4.beta[2], fitH4.se[2]).map(r4), ciCluster: [r4(ciH4.lo), r4(ciH4.hi)], sigmaU: r4(fitH4.sigmaU), sigmaE: r4(fitH4.sigmaE), icc: r4(fitH4.icc), iters: ciH4.iters }

// =============================================================================================
// H2 is a one-observation-per-task contrast (n = 31): there is no repeated measurement to model,
// so no random intercept is possible and none is invented here.
// =============================================================================================
line('')
line('H2: 31 tasks, one paired difference each - no repeated measurement, so no random intercept.')
out.sections.H2 = { note: 'one observation per task; a random intercept is not identified and is not fitted' }

const ji = process.argv.indexOf('--json')
const path = ji >= 0 ? (process.argv[ji + 1] ?? 'analysis/mixed-effects-6model-2026-10-04.json') : null
if (path) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(out, null, 1) + String.fromCharCode(10))
  line('')
  line('wrote ' + path)
}
