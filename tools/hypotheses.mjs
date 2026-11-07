/**
 * hypotheses.mjs - H1-H5, run by the procedures PRE-REGISTRATION.md actually specifies.
 *
 * WHY THIS EXISTS
 * ---------------
 * notes/reviews/CRITICAL-REVIEW.md section 2.2: both confirmatory verdicts were reached by bending the
 * pre-registered rules. H1's decision rule requires a regression (D_ij = b0 + b1*S_ij + u_i
 * + e_ij with a bootstrap CI for b1) and no b1, no CI and no model output existed anywhere
 * in the repo; the verdict rested on a three-point monotonic table. H2's rule says
 * "inconclusive" when the CI spans zero, and FINDINGS printed "NOT SUPPORTED"; the
 * pre-registered exact Wilcoxon signed-rank was also replaced by a sign test inside
 * tools/h2-test.mjs, without disclosure.
 *
 * This file implements the rules as written, and nothing else. Where a rule is defective,
 * it is executed anyway and the defect is reported rather than repaired - a pre-registered
 * rule that is quietly improved after the fact is not a pre-registered rule.
 *
 * H1 is computed for the first time here. It is computable now only because the canonical
 * cost panel puts all seven provider x model cells in one table; the three-point version it
 * was previously judged on could not have supported a regression.
 *
 * Usage: node tools/hypotheses.mjs [--json analysis/hypotheses.json]
 */
import { buildPanel, summarise, mean, MODELS, selectionFromArgv, refuseFiledWrite, refuse, DEFAULT_DATASETS } from './cost-panel.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { clusterBootstrap } from './stats.mjs'

let SELECTION
try { SELECTION = selectionFromArgv() } catch (e) { refuse(e.message) }
if (SELECTION.join(',') !== DEFAULT_DATASETS.join(',')) console.log('datasets: ' + SELECTION.join(', ') + '  (NOT the default six-model panel)')
const { panel, missing } = buildPanel({ datasets: SELECTION })
if (missing.length) console.log('NOT YET COLLECTED (no runs.jsonl): ' + missing.join(', '))
if (!panel.length) { console.error('nothing to analyse: no panel rows in ' + SELECTION.join(', ')); process.exit(2) }
// EVERY analysed record, matching tools/panel-analysis.mjs. This used to be `panel.filter(r => r.primary)`
// - first-record-per-cell - while the panel tool averaged all records, and because `primary` is
// assigned before the exclusion checks, that view silently deleted 142 cells whose first record was
// infrastructure-excluded. H3 moved 23% between the two populations (+1.048 vs +1.290) on what the
// register calls "the study's one clean confirmatory win". Two tools cannot implement two rules.
const prim = panel
const out = { generated: new Date().toISOString(), sections: {} }
const MODELS_IN_ORDER = Object.keys(MODELS).filter((m) => prim.some((r) => r.model === m))
const RATIO = (m) => MODELS[m].card.out / MODELS[m].card.miss

// ---- shared statistics ---------------------------------------------------------------------
// The bootstrap is tools/stats.mjs, and it builds a FRESH stream per call.
//
// This file used to hold its own `let rngLabel = 0; const rnd = makeRng(20261001)` - ONE
// module-level stream, shared by every interval printed below - under a comment that claimed
// "Fresh stream per bootstrap call, not one shared module-level state". The comment was the lie,
// not the code: nothing had been changed. No output test could catch it, because every number
// still looked plausible; what depended on the bug was the ORDER the sections ran in.
// Two tools must not implement two bootstraps. See tools/stats.mjs.

/** OLS of y on x, both already demeaned within task when within=true. */
function slope(rows, xf, yf) {
  const xs = rows.map(xf), ys = rows.map(yf)
  const mx = mean(xs), my = mean(ys)
  let sxy = 0, sxx = 0
  for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2 }
  return sxx === 0 ? NaN : sxy / sxx
}
/** Demean every row within its task. */
function demean(rows, fields) {
  const byTask = new Map()
  for (const r of rows) { if (!byTask.has(r.task)) byTask.set(r.task, []); byTask.get(r.task).push(r) }
  const outRows = []
  for (const [, group] of byTask) {
    if (group.length < 2) continue
    const mu = {}
    for (const f of fields) mu[f] = mean(group.map((r) => r[f]))
    for (const r of group) { const c = { ...r }; for (const f of fields) c[f] = r[f] - mu[f]; outRows.push(c) }
  }
  return outRows
}

/** Exact one-sided Wilcoxon signed-rank null, by DP over subset sums of the ranks. */
function wilcoxonSignedRank(d) {
  const nz = d.filter((x) => x !== 0)
  const n = nz.length
  if (!n) return { n: 0, W: 0, p: 1 }
  const abs = nz.map(Math.abs)
  const order = abs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0])
  const ranks = new Array(n).fill(0)
  let i = 0
  while (i < n) {                                     // average ranks for ties, Wilcoxon's convention
    let j = i
    while (j + 1 < n && order[j + 1][0] === order[i][0]) j++
    const avg = (i + j + 2) / 2
    for (let k = i; k <= j; k++) ranks[order[k][1]] = avg
    i = j + 1
  }
  const W = nz.reduce((s, v, idx) => s + (v > 0 ? ranks[idx] : 0), 0)
  const total = ranks.reduce((a, b) => a + b, 0)
  // count[k] = number of subsets of the ranks summing to k
  let count = new Float64Array(total + 1); count[0] = 1
  for (const rk of ranks) {
    const next = new Float64Array(total + 1)
    for (let k = 0; k <= total; k++) { if (!count[k]) continue; next[k] += count[k]; next[k + rk] += count[k] }
    count = next
  }
  // TAIL. H2's alternative is mean(d) < 0, i.e. a LARGE POSITIVE sum of signed ranks is evidence
  // AGAINST it. The first version returned P(W+ >= observed), which is the p-value for the opposite
  // hypothesis: feeding it the strongest possible support gave p = 1.000000, so "p < 0.05 AND CI
  // below 0" could never fire and SUPPORTED was unreachable as coded. The correct one-sided p for
  // mean(d) < 0 is P(W+ <= observed).
  let le = 0
  for (let k = 0; k <= Math.round(W); k++) le += count[k]
  let ge = 0
  for (let k = Math.round(W); k <= total; k++) ge += count[k]
  return { n, W, p: le / Math.pow(2, n), pWrongTail: ge / Math.pow(2, n),
    note: 'exact null over all 2^n sign assignments; p is P(W+ <= observed) for mean(d) < 0' }
}

// =============================================================================================
// H1 — CONFIRMATORY, PRIMARY.  D_ij = b0 + b1 * S_ij + u_i + e_ij ;  H1: b1 > 0
// =============================================================================================
console.log('='.repeat(92))
console.log('H1  "The billed-cost penalty of code-mode presentation increases with output share of cost."')
console.log('    D_ij = cost_billed(ptc) - cost_billed(native), mean over seeds')
console.log('    S_ij = output share = (output tokens * outRate) / cost_billed, averaged over the two arms')
console.log('    MODEL: D_ij = b0 + b1*S_ij + u_i + e_ij,  u_i ~ N(0, s_u^2),  i = task')
console.log('    DECISION (as filed): supported if b1 > 0 AND the bootstrap 95% CI for b1 excludes 0;')
console.log('                        refuted if b1 <= 0 with a CI excluding 0; otherwise inconclusive.')
console.log('='.repeat(92))

const h1rows = []
for (const m of MODELS_IN_ORDER) {
  const card = MODELS[m].card
  const byTask = new Map()
  for (const r of prim.filter((x) => x.model === m)) {
    if (!['dsh:native', 'dsh:ptc'].includes(r.arm)) continue
    const e = byTask.get(r.task) ?? { task: r.task, model: m, native: [], ptc: [], nativeS: [], ptcS: [], nativeReq: [], ptcReq: [] }
    const share = (r.out / 1e6) * card.out / r.costBilled
    if (r.arm === 'dsh:native') { e.native.push(r.costBilled); e.nativeS.push(share); e.nativeReq.push(r.requests) }
    else { e.ptc.push(r.costBilled); e.ptcS.push(share); e.ptcReq.push(r.requests) }
    byTask.set(r.task, e)
  }
  for (const [, e] of byTask) {
    if (!e.native.length || !e.ptc.length) continue
    h1rows.push({
      task: e.task, model: m, ratio: RATIO(m),
      D: mean(e.ptc) - mean(e.native),
      S: (mean(e.ptcS) + mean(e.nativeS)) / 2,
      dSteps: mean(e.ptcReq) - mean(e.nativeReq),
      nativeSteps: mean(e.nativeReq), ptcSteps: mean(e.ptcReq),
    })
  }
}
console.log('cells: ' + h1rows.length + ' task x provider-model observations, ' + new Set(h1rows.map((r) => r.task)).size + ' tasks, ' + MODELS_IN_ORDER.length + ' provider cells')

const b1Pooled = slope(h1rows, (r) => r.S, (r) => r.D)
const ciPooled = clusterBootstrap(h1rows, (rows) => slope(rows, (r) => r.S, (r) => r.D))
const within = demean(h1rows, ['D', 'S'])
const b1Within = slope(within, (r) => r.S, (r) => r.D)
const ciWithin = clusterBootstrap(h1rows, (rows) => slope(demean(rows, ['D', 'S']), (r) => r.S, (r) => r.D))
console.log('')
console.log('  b1 pooled OLS                 = ' + b1Pooled.toFixed(4) + '   cluster-bootstrap 95% CI [' + ciPooled.lo.toFixed(4) + ', ' + ciPooled.hi.toFixed(4) + ']')
console.log('  b1 within-task (random-intercept-equivalent) = ' + b1Within.toFixed(4) + '   cluster-bootstrap 95% CI [' + ciWithin.lo.toFixed(4) + ', ' + ciWithin.hi.toFixed(4) + ']')
const h1Label = b1Pooled > 0 && ciPooled.lo > 0 ? 'SUPPORTED'
  : b1Pooled <= 0 && ciPooled.hi < 0 ? 'REFUTED'
  : 'INCONCLUSIVE'
console.log('  PRE-REGISTERED LABEL (pooled, the primary specification as filed): ' + h1Label)
console.log('  PRE-REGISTERED LABEL (within-task): ' + (b1Within > 0 && ciWithin.lo > 0 ? 'SUPPORTED' : b1Within <= 0 && ciWithin.hi < 0 ? 'REFUTED' : 'INCONCLUSIVE'))
const loo = MODELS_IN_ORDER.map((m) => {
  const rows = h1rows.filter((r) => r.model !== m)
  return { dropped: MODELS[m].label, b1: slope(rows, (r) => r.S, (r) => r.D) }
})
console.log('  leave-one-provider-out b1: ' + loo.map((l) => l.dropped.split(' ').pop() + '=' + l.b1.toFixed(3)).join('  '))
const sameSign = loo.every((l) => Math.sign(l.b1) === Math.sign(b1Pooled))
console.log('  sign of b1 across all ' + loo.length + ' leave-one-out fits: ' + (sameSign ? 'all ' + (b1Pooled > 0 ? 'positive' : 'negative') + ' -> the sign is robust to dropping any one provider' : 'CHANGES SIGN -> not robust'))

console.log('')
console.log('  PRE-SPECIFIED SECONDARY: "the penalty at ratio 5.0 must exceed the penalty at ratio 3.33')
console.log('  by more than 5 percentage points for the price-ratio account to count as supported."')
const pen = {}
for (const m of MODELS_IN_ORDER) {
  const rows = h1rows.filter((r) => r.model === m)
  const nat = mean(prim.filter((r) => r.model === m && r.arm === 'dsh:native').map((r) => r.costBilled))
  pen[m] = mean(rows.map((r) => r.D)) / nat * 100
}
const r2 = (x) => Math.round(x * 100) / 100
const g50 = MODELS_IN_ORDER.filter((m) => r2(RATIO(m)) === 5)
const g333 = MODELS_IN_ORDER.filter((m) => r2(RATIO(m)) === 3.33)
for (const m of MODELS_IN_ORDER) console.log('    ' + MODELS[m].label.padEnd(20) + 'ratio ' + RATIO(m).toFixed(2) + '  PTC penalty ' + (pen[m] >= 0 ? '+' : '') + pen[m].toFixed(1) + '%')
const gap = mean(g50.map((m) => pen[m])) - mean(g333.map((m) => pen[m]))
console.log('    mean penalty at ratio 5.00 (' + g50.map((m) => MODELS[m].label).join(', ') + ') = ' + mean(g50.map((m) => pen[m])).toFixed(1) + '%')
console.log('    mean penalty at ratio 3.33 (' + g333.map((m) => MODELS[m].label).join(', ') + ') = ' + mean(g333.map((m) => pen[m])).toFixed(1) + '%')
console.log('    gap = ' + gap.toFixed(1) + ' pp  ->  secondary ' + (gap > 5 ? 'MET (nominally)' : 'NOT MET'))
const within5 = Math.max(...g50.map((m) => pen[m])) - Math.min(...g50.map((m) => pen[m]))
console.log('    BUT the spread WITHIN ratio 5.00 alone is ' + within5.toFixed(1) + ' pp, versus ' + (Math.max(...Object.values(pen)) - Math.min(...Object.values(pen))).toFixed(1) + ' pp across the whole ratio axis.')
console.log('    A nominal pass with that much within-group variance is not evidence for the ratio account.')

// =============================================================================================
// H2 — CONFIRMATORY, CAUSAL.  d_i = P_i(terse) - P_i(default), P = cost(ptc) - cost(native)
// =============================================================================================
console.log('')
console.log('='.repeat(92))
console.log('H2  "Reducing output volume reduces the PTC penalty."   H2: mean(d) < 0')
console.log('    d_i = [cost(ptc-terse) - cost(native-terse)] - [cost(ptc) - cost(native)], mean over seeds')
console.log('    DECISION (as filed): supported if the EXACT ONE-SIDED WILCOXON SIGNED-RANK test gives')
console.log('    p < 0.05 AND the bootstrap 95% CI for mean(d) lies entirely below 0. Refuted if the CI')
console.log('    lies entirely above 0. Otherwise INCONCLUSIVE.')
console.log('='.repeat(92))
// Only glm-terse qualifies: it is the one matrix whose terse arms are verified to have been
// terse AND whose base arms are otherwise identical (same model, same tasks, same seeds).
const d2 = []
{
  const m = 'glm-5.3-flash'
  const byTask = new Map()
  for (const r of prim.filter((x) => x.model === m)) {
    if (!r.arm.startsWith('dsh:')) continue
    const e = byTask.get(r.task) ?? { task: r.task, native: [], ptc: [], nativeT: [], ptcT: [] }
    if (r.arm === 'dsh:native') e.native.push(r.costBilled)
    if (r.arm === 'dsh:ptc') e.ptc.push(r.costBilled)
    if (r.arm === 'dsh:native-terse') e.nativeT.push(r.costBilled)
    if (r.arm === 'dsh:ptc-terse') e.ptcT.push(r.costBilled)
    byTask.set(r.task, e)
  }
  for (const [, e] of byTask) {
    if (!e.native.length || !e.ptc.length || !e.nativeT.length || !e.ptcT.length) continue
    d2.push({ task: e.task, d: (mean(e.ptcT) - mean(e.nativeT)) - (mean(e.ptc) - mean(e.native)) })
  }
}
const meanD = mean(d2.map((r) => r.d))
const ciD = clusterBootstrap(d2, (rows) => mean(rows.map((r) => r.d)))
const wr = wilcoxonSignedRank(d2.map((r) => r.d))
console.log('  paired tasks with all four arms: ' + d2.length)
console.log('  mean(d)                        = ' + (meanD >= 0 ? '+$' : '-$') + Math.abs(meanD).toFixed(6))
console.log('  d < 0 in                       = ' + d2.filter((r) => r.d < 0).length + ' of ' + d2.length + ' tasks')
console.log('  bootstrap 95% CI for mean(d)   = [' + (ciD.lo >= 0 ? '+' : '-') + '$' + Math.abs(ciD.lo).toFixed(6) + ', ' + (ciD.hi >= 0 ? '+' : '-') + '$' + Math.abs(ciD.hi).toFixed(6) + ']')
console.log('  EXACT one-sided Wilcoxon signed-rank: n = ' + wr.n + ', W+ = ' + wr.W + ', p = ' + wr.p.toFixed(4))
const ciBelow = ciD.hi < 0, ciAbove = ciD.lo > 0
const h2Label = wr.p < 0.05 && ciBelow ? 'SUPPORTED' : ciAbove ? 'REFUTED' : 'INCONCLUSIVE'
console.log('  CI lies entirely below 0? ' + ciBelow + '   entirely above 0? ' + ciAbove)
console.log('  PRE-REGISTERED LABEL: ' + h2Label)
console.log('  [FINDINGS F21 printed "NOT SUPPORTED". The rule has no such outcome; it has SUPPORTED,')
console.log('   REFUTED and INCONCLUSIVE. The substantive reading is unchanged - the mechanism does not')
console.log('   survive its causal test - but the label was not the pre-registered one.]')

// =============================================================================================
// H3 — CONFIRMATORY, SECONDARY.  steps_ij = b0 + b1*native_ij + u_i + e_ij ; H3: b1 > 0
// =============================================================================================
console.log('')
console.log('='.repeat(92))
console.log('H3  "Presenting more tool schemas increases the number of model requests."   H3: b1 > 0')
console.log('    native_ij = 1 when the run used the native schema set, 0 when PTC (1 schema)')
console.log('    DECISION (as filed): "the CI for b1 excludes 0" - no level and no sidedness given;')
console.log('    executed here as a two-sided 95% CI, which is the stricter reading.')
console.log('='.repeat(92))
const h3rows = []
for (const m of MODELS_IN_ORDER) {
  for (const r of prim.filter((x) => x.model === m && (x.arm === 'dsh:native' || x.arm === 'dsh:ptc'))) {
    h3rows.push({ task: r.task, model: m, y: r.requests, x: r.arm === 'dsh:native' ? 1 : 0 })
  }
}
const b3Pooled = slope(h3rows, (r) => r.x, (r) => r.y)
const ci3Pooled = clusterBootstrap(h3rows, (rows) => slope(rows, (r) => r.x, (r) => r.y))
const w3 = demean(h3rows, ['x', 'y'])
const b3Within = slope(w3, (r) => r.x, (r) => r.y)
const ci3Within = clusterBootstrap(h3rows, (rows) => slope(demean(rows, ['x', 'y']), (r) => r.x, (r) => r.y))
console.log('  n = ' + h3rows.length + ' runs, ' + new Set(h3rows.map((r) => r.task)).size + ' tasks, ' + MODELS_IN_ORDER.length + ' provider cells')
console.log('  b1 pooled  = ' + b3Pooled.toFixed(3) + ' requests   95% CI [' + ci3Pooled.lo.toFixed(3) + ', ' + ci3Pooled.hi.toFixed(3) + ']')
console.log('  b1 within-task = ' + b3Within.toFixed(3) + ' requests   95% CI [' + ci3Within.lo.toFixed(3) + ', ' + ci3Within.hi.toFixed(3) + ']')
console.log('  PRE-REGISTERED LABEL (within-task): b1 ' + (b3Within > 0 && ci3Within.lo > 0 ? '> 0 with CI excluding 0 -> SUPPORTED' : 'NOT SUPPORTED by the filed rule'))
console.log('  per provider, PTC minus native requests:')
for (const m of MODELS_IN_ORDER) {
  const nm = mean(prim.filter((r) => r.model === m && r.arm === 'dsh:native').map((r) => r.requests))
  const pm = mean(prim.filter((r) => r.model === m && r.arm === 'dsh:ptc').map((r) => r.requests))
  console.log('    ' + MODELS[m].label.padEnd(20) + 'native ' + nm.toFixed(1).padStart(5) + '  ptc ' + pm.toFixed(1).padStart(5) + '   PTC ' + (pm < nm ? '' : '+') + (pm - nm).toFixed(1) + '  (' + ((pm - nm) / nm * 100 >= 0 ? '+' : '') + ((pm - nm) / nm * 100).toFixed(0) + '%)')
}

// =============================================================================================
// H4 — CONFIRMATORY, NEGATIVE.  cache hit rate as a covariate in the H1 model
// =============================================================================================
console.log('')
console.log('='.repeat(92))
console.log('H4  "Cache hit rate does not predict per-arm cost differences."')
console.log('    DECISION (as filed): supported if the CI for the cache coefficient CONTAINS 0;')
console.log('    refuted if it excludes 0, "which would be a new finding rather than a failure".')
console.log('='.repeat(92))
const h4rows = []
for (const m of MODELS_IN_ORDER) {
  const byTask = new Map()
  for (const r of prim.filter((x) => x.model === m)) {
    if (!['dsh:native', 'dsh:ptc'].includes(r.arm)) continue
    const e = byTask.get(r.task) ?? { task: r.task, model: m, n: [], p: [] }
    ;(r.arm === 'dsh:native' ? e.n : e.p).push(r)
    byTask.set(r.task, e)
  }
  for (const [, e] of byTask) {
    if (!e.n.length || !e.p.length) continue
    h4rows.push({
      task: e.task, model: m,
      D: mean(e.p.map((r) => r.costBilled)) - mean(e.n.map((r) => r.costBilled)),
      S: (mean(e.p.map((r) => (r.out / 1e6) * MODELS[m].card.out / r.costBilled)) + mean(e.n.map((r) => (r.out / 1e6) * MODELS[m].card.out / r.costBilled))) / 2,
      C: (mean(e.p.map((r) => r.hitRate ?? 0)) + mean(e.n.map((r) => r.hitRate ?? 0))) / 2,
    })
  }
}
/** Two-predictor OLS through the origin on demeaned data. */
function slope2(rows, f1, f2, yf) {
  const ones = rows.map(() => 1)
  let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0
  for (const r of rows) { const x1 = f1(r), x2 = f2(r), y = yf(r); a11 += x1 * x1; a12 += x1 * x2; a22 += x2 * x2; b1 += x1 * y; b2 += x2 * y }
  const det = a11 * a22 - a12 * a12
  if (!det) return [NaN, NaN]
  return [(b1 * a22 - b2 * a12) / det, (a11 * b2 - a12 * b1) / det]
}
const h4d = demean(h4rows, ['D', 'S', 'C'])
const [bS, bC] = slope2(h4d, (r) => r.S, (r) => r.C, (r) => r.D)
const ciC = clusterBootstrap(h4rows, (rows) => slope2(demean(rows, ['D', 'S', 'C']), (r) => r.S, (r) => r.C, (r) => r.D)[1])
console.log('  n = ' + h4rows.length + ' task x cell observations')
console.log('  coefficient on S (output share)   = ' + bS.toFixed(4))
console.log('  coefficient on cache hit rate     = ' + bC.toFixed(4) + '   95% CI [' + ciC.lo.toFixed(4) + ', ' + ciC.hi.toFixed(4) + ']')
const contains0 = ciC.lo <= 0 && ciC.hi >= 0
console.log('  CI contains 0? ' + contains0 + '  ->  PRE-REGISTERED LABEL: ' + (contains0 ? 'SUPPORTED' : 'REFUTED'))
console.log('  NOTE ON THE RULE: as filed, H4 cannot fail in the direction that matters - a null result')
console.log('  "supports" the study\'s own negative hypothesis and a non-null result is pre-declared a')
console.log('  publishable new finding, so both outcomes are successes. The number above is reported for')
console.log('  completeness; H4 is not evidence about cache and should be demoted to exploratory.')

// =============================================================================================
// H5 — EXPLORATORY as filed: "Harness cost rankings are not stable across providers."
//      "No formal test. Two providers cannot establish this and it is not a primary hypothesis."
//      We now have seven. The hypothesis was pre-registered; only its test was withheld.
// =============================================================================================
console.log('')
console.log('='.repeat(92))
console.log('H5  "Harness cost rankings are not stable across providers."   (filed EXPLORATORY, no test)')
console.log('    The reason given for withholding a test was that two providers cannot establish it.')
console.log('    Seven now can. See tools/panel-analysis.mjs section A1b/A1c for the full test; the')
console.log('    headline: median Spearman rho between provider rankings = 0.286, permutation')
console.log('    p = 0.012, and only 62.9% of arm-vs-arm cost comparisons keep their winner when')
console.log('    repeated on a second provider (chance 50%; within the DSH arms alone, 55.6%).')
console.log('    H5 is therefore CONFIRMED as a hypothesis, while remaining EXPLORATORY in status,')
console.log('    because it was filed without a test and a study cannot promote its own hypothesis')
console.log('    after seeing the data. The paper reports it as exploratory and says so.')
console.log('='.repeat(92))

out.sections.H1 = { n: h1rows.length, b1Pooled, ciPooled, b1Within, ciWithin, label: h1Label, leaveOneOut: loo, penaltyByModel: pen, secondaryGapPp: gap, withinRatio5SpreadPp: within5 }
out.sections.H2 = { n: d2.length, meanD, ciD, wilcoxon: wr, label: h2Label, ciBelow, ciAbove }
out.sections.H3 = { n: h3rows.length, b1Pooled: b3Pooled, ciPooled: ci3Pooled, b1Within: b3Within, ciWithin: ci3Within }
out.sections.H4 = { n: h4rows.length, bS, bC, ciC, contains0 }
const ji = process.argv.indexOf('--json')
if (ji >= 0) {
  const path = process.argv[ji + 1] ?? 'analysis/hypotheses.json'
  try { refuseFiledWrite(path, SELECTION) } catch (e) { refuse(e.message) }
  mkdirSync(path.split(/[\\/]/).slice(0, -1).join('/') || '.', { recursive: true })
  writeFileSync(path, JSON.stringify(out, null, 1))
  console.log('\nwrote ' + path)
}
