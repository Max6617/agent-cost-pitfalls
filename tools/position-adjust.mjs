/**
 * position-adjust.mjs - the PTC-vs-native differential with execution order controlled.
 *
 * THE PROBLEM. tools/run-experiment.mjs runs the ten arms of a (task, seed) block in a shuffled order
 * and records each arm's index as `position`. notes/defects/DEFECT-position-confound-2026-10-04.md section 2
 * measures that position carries 1.75x-3.82x of cost within a single arm, and the shuffle is
 * degenerate - its seed is a function of (task, seed) alone, so the permutation is identical in every
 * matrix. Re-measured for tasks-b in notes/defects/DEFECT-position-standardisation-artefact-2026-10-09.md: all 320
 * blocks, all five matrices, the same positions. Because dsh:ptc and dsh:native sit in different
 * positions in almost every block, the raw paired differential mixes the mode effect with an
 * execution-order effect.
 *
 * WHY NOT REWEIGHTING. Direct standardisation needs each arm's cost at each position, and with one
 * observation per arm per block that information does not exist within a block. Section 1 of
 * notes/defects/DEFECT-position-standardisation-artefact-2026-10-09.md shows what the shipped attempt actually
 * computed (a rescaling). The instrument that keeps the pairing is a model of the WITHIN-BLOCK
 * DIFFERENCE.
 *
 * THE ESTIMATOR. For every block holding both arms,
 *
 *     d_ts = c_ptc(ts) - c_native(ts)
 *     d_ts = alpha + [ f(p_ptc) - f(p_native) ] + e_ts
 *
 * with f a step function on the ten positions, position 0 the reference, so the regressors are nine
 * DIFFERENCED dummies and alpha is the differential a pair would show if both arms sat in the same
 * position distribution. Identification comes from the permutation varying across tasks: within one
 * block arm and position are matched one-to-one, so nothing inside a single block can separate them.
 *
 * SCALE. `log` (the default) takes d as a log ratio, so alpha is a log ratio and is reported as
 * (exp(alpha) - 1) * 100 percent. It is the better-specified scale here because caching changes the
 * price of a token by an order of magnitude rather than adding a constant to a bill. `usd` takes d in
 * dollars and is exact only when the position effect is additive in dollars.
 *
 * IDENTIFICATION NEEDS THE OFFSET TO VARY, and this is not a formality. If every block puts ptc
 * exactly k positions after native, then "ptc is cheaper by alpha" and "cost rises by alpha per
 * position step" are the same statement, alpha is not identified, and the fit is rank deficient. The
 * real permutation varies (58 distinct pairs in tasks-b), which is what makes the adjustment possible
 * at all; a synthetic pure shift is refused, and tools/position-adjust.test.mjs pins that refusal.
 *
 * A DEGENERATE DESIGN IS REFUSED, NOT GUESSED. If every block has the same (native, ptc) position
 * pair, f is not identified and no number is returned; likewise for a rank-deficient differenced
 * design. The cluster bootstrap over tasks drops replicates whose resample cannot be identified and
 * reports how many it kept, so a wide interval can never be read as a precise one.
 *
 * Usage: node tools/position-adjust.mjs [--datasets batchb] [--json analysis/position-adjust-<date>.json]
 */
import { buildPanel, summarise, mean, pairedDiffs, MODELS, selectionFromArgv, refuse, refuseFiledWrite, DEFAULT_DATASETS } from './cost-panel.mjs'
import { clusterBootstrap } from './stats.mjs'
import { olsReference } from './mixed-effects.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { makeRng } from './rng.mjs'

export const NATIVE_ARM = 'dsh:native'
export const PTC_ARM = 'dsh:ptc'

/**
 * One entry per (task, seed) block holding BOTH arms, with the two positions and the two costs.
 * A block missing either arm contributes nothing: this estimator is paired or it is nothing.
 */
export function pairedBlocks (rows, nativeArm = NATIVE_ARM, ptcArm = PTC_ARM) {
  const byBlock = new Map()
  for (const r of rows) {
    if (r.arm !== nativeArm && r.arm !== ptcArm) continue
    const k = r.task + '|' + r.seed
    const e = byBlock.get(k) ?? { task: r.task, seed: r.seed }
    e[r.arm] = r
    byBlock.set(k, e)
  }
  const out = []
  for (const e of byBlock.values()) {
    const n = e[nativeArm], q = e[ptcArm]
    if (!n || !q) continue
    if (n.position == null || q.position == null) continue
    out.push({ task: n.task, seed: n.seed, pn: Number(n.position), pq: Number(q.position), cn: n.costBilled, cq: q.costBilled })
  }
  return out
}

/** The distinct (native, ptc) position pairs, which is what identifies f. */
export function positionPairs (blocks) {
  return new Set(blocks.map((b) => b.pn + '>' + b.pq))
}

/** Differenced dummies: one column per position except the reference. */
export function positionColumns (blocks, ref = 0) {
  return [...new Set(blocks.flatMap((b) => [b.pn, b.pq]))].filter((p) => p !== ref).sort((a, b) => a - b)
}

export function designMatrix (blocks, cols) {
  return blocks.map((b) => cols.map((p) => (b.pq === p ? 1 : 0) - (b.pn === p ? 1 : 0)))
}

/**
 * Fit alpha. Throws - with the reason - when the design cannot support an adjusted estimate, so a
 * caller that wants a number has to handle the refusal rather than receive a plausible NaN.
 */
export function adjustedFit (blocks, { scale = 'log', cols = null } = {}) {
  if (blocks.length < 3) throw new Error('position-adjust: fewer than 3 paired blocks')
  const pairs = positionPairs(blocks)
  if (pairs.size < 2) {
    throw new Error('position-adjust: every block has the same (native, ptc) position pair (' +
      [...pairs][0] + '), so a position effect cannot be separated from the arm effect')
  }
  const use = cols ?? positionColumns(blocks)
  if (!use.length) throw new Error('position-adjust: both arms occupy only the reference position')
  const X = designMatrix(blocks, use)
  const y = blocks.map((b) => scale === 'log'
    ? Math.log(Math.max(b.cq, 1e-12)) - Math.log(Math.max(b.cn, 1e-12))
    : b.cq - b.cn)
  const fit = olsReference(y, X)
  if (fit.singular) throw new Error('position-adjust: the differenced position design is rank deficient')
  return { alpha: fit.beta[0], se: fit.se[0], beta: fit.beta, cols: use, scale, n: fit.n, pairs: pairs.size }
}

/** alpha in the units the study reports: percent of the native arm's mean cost. */
export function toPercent (alpha, scale, nativeMean) {
  return scale === 'log' ? (Math.exp(alpha) - 1) * 100 : (alpha / nativeMean) * 100
}

/**
 * The adjusted differential with a task-clustered bootstrap interval. Replicates whose resample
 * cannot identify f return NaN, which stats.mjs drops; `ci.n` is how many survived, against `iters`.
 */
// B is 20,000 here rather than stats.mjs's 200,000 because every replicate REFITS a ten-parameter
// regression; the interval it reports is ~10pp wide, so its Monte Carlo error is not the binding term.
// The tool reports \`iters\` and \`ciReplicates\` in its output, so the number is disclosed where used.
export function adjustedDifferential (rows, { scale = 'log', nativeMean = null, iters = 20000, seed = 12345 } = {}) {
  const blocks = pairedBlocks(rows)
  const nat = nativeMean ?? mean(rows.filter((r) => r.arm === NATIVE_ARM).map((r) => r.costBilled))
  const cols = positionColumns(blocks)
  const fit = adjustedFit(blocks, { scale, cols })
  const ci = clusterBootstrap(blocks, (draw) => {
    try {
      const f = adjustedFit(draw, { scale, cols })
      return toPercent(f.alpha, scale, nat)
    } catch { return NaN }
  }, { iters, seed })
  return {
    scale, blocks: blocks.length, tasks: new Set(blocks.map((b) => b.task)).size,
    positionPairs: positionPairs(blocks).size, columns: cols.length,
    alpha: fit.alpha, se: fit.se, pct: toPercent(fit.alpha, scale, nat),
    ciLoPct: ci.lo, ciHiPct: ci.hi, ciReplicates: ci.n, iters: ci.iters,
  }
}

/**
 * Which scale the data prefer, judged OUT OF SAMPLE and in a metric both scales can be scored in.
 *
 * The two scales model different responses - a log ratio and a dollar difference - so their residuals
 * are not comparable, and comparing them directly would decide the question by the units. Instead both
 * are asked to predict the SAME held-out block, and each prediction is scored the same way: as a
 * RELATIVE DOLLAR ERROR against that block's observed difference (see the comment at the scoring
 * site). This is NOT the root-mean-square error of a held-out log ratio, and the returned fields keep
 * the rmseLog/rmseUsd names only because those names are already filed. Folds are TASKS, resampled
 * deterministically from one seed, so a model is always scored on tasks it has not seen.
 *
 * Returns the root-mean-square of that relative dollar error for each scale. A lower number is
 * better; if the two are close the data do not choose, and that is reported rather than resolved. It
 * is ONE seeded fold draw, not a distribution: no claim should turn on a per-matrix preference
 * without a seed sweep.
 */
export function crossValidateScale (rows, { folds = 8, seed = 20261009, cols = null } = {}) {
  const blocks = pairedBlocks(rows)
  const use = cols ?? positionColumns(blocks)
  const tasks = [...new Set(blocks.map((b) => b.task))].sort()
  const rnd = makeRng(seed)
  const order = tasks.map((t) => ({ t, k: rnd() })).sort((a, b) => a.k - b.k).map((x) => x.t)
  const scored = { log: [], usd: [] }
  for (let f = 0; f < folds; f++) {
    const test = new Set(order.filter((_, i) => i % folds === f))
    const train = blocks.filter((b) => !test.has(b.task))
    const held = blocks.filter((b) => test.has(b.task))
    if (!train.length || !held.length) continue
    let fitLog = null, fitUsd = null
    try { fitLog = adjustedFit(train, { scale: 'log', cols: use }) } catch { /* unidentifiable fold */ }
    try { fitUsd = adjustedFit(train, { scale: 'usd', cols: use }) } catch { /* unidentifiable fold */ }
    for (const b of held) {
      const observed = b.cq - b.cn
      const df = (fit) => fit ? fit.alpha + use.reduce((s, p, j) => s + fit.beta[j + 1] * ((b.pq === p ? 1 : 0) - (b.pn === p ? 1 : 0)), 0) : null
      // BOTH SCALES ARE SCORED ON THE SAME QUANTITY, in the same units, and this is deliberate.
      // Scoring the log model on its log ratio and the additive one on its dollar difference would
      // decide the question by the metric; converting the additive prediction into a ratio instead
      // blows up whenever the predicted difference approaches the block's own cost, which is how an
      // earlier version of this check produced RMSEs of 10 in log units for GLM. So each model's
      // prediction is expressed as a RELATIVE dollar error against the same observed difference,
      // which is scale-free and finite for both.
      const dl = df(fitLog)
      if (dl != null) scored.log.push(((b.cn * (Math.exp(dl) - 1)) - observed) / Math.max(b.cn, 1e-12))
      const du = df(fitUsd)
      if (du != null) scored.usd.push((du - observed) / Math.max(b.cn, 1e-12))
    }
  }
  const rmse = (a) => a.length ? Math.sqrt(a.reduce((x, y) => x + y * y, 0) / a.length) : null
  return { folds, scoredBlocks: scored.log.length, rmseLog: rmse(scored.log), rmseUsd: rmse(scored.usd) }
}

/** The filed contrast, computed the filed way, so the two travel in one table. */
export function rawDifferential (panel, model) {
  const nat = summarise(panel).find((r) => r.model === model && r.arm === NATIVE_ARM)
  const d = pairedDiffs(panel, model, NATIVE_ARM, PTC_ARM)
  if (!nat || !d.size) return null
  const ci = clusterBootstrap([...d].map(([task, v]) => ({ task, v })), (draw) => mean(draw.map((x) => x.v)))
  const rel = mean([...d.values()]) / nat.billed * 100
  return { tasks: d.size, pct: rel, ciLoPct: ci.lo / nat.billed * 100, ciHiPct: ci.hi / nat.billed * 100, nativeMean: nat.billed }
}

// ---- CLI -------------------------------------------------------------------------------------
if (process.argv[1] && process.argv[1].endsWith('position-adjust.mjs')) main()

function main () {
  let SELECTION
  try { SELECTION = selectionFromArgv() } catch (e) { refuse(e.message) }
  if (SELECTION.join(',') !== DEFAULT_DATASETS.join(',')) console.log('datasets: ' + SELECTION.join(', ') + '  (NOT the default six-model panel)')
  const { panel } = buildPanel({ datasets: SELECTION })
  if (!panel.length) refuse('nothing to adjust: no panel rows in ' + SELECTION.join(', '))
  const fmt = (v) => (v >= 0 ? '+' : '') + v.toFixed(1) + '%'
  const out = []
  const forScaleCheck = []
  console.log('PTC vs native, paired by (task, seed). RAW is the filed contrast; ADJUSTED differences out')
  console.log('the position effect. log = (exp(alpha)-1); usd = additive. Neither is crowned: the scale')
  console.log('check below is one seeded fold draw, and the paper reports both scales everywhere.')
  console.log('')
  console.log('  ' + 'model'.padEnd(20) + 'raw (filed)'.padStart(22) + '  adjusted log'.padStart(24) + '  adjusted usd'.padStart(24))
  for (const m of Object.keys(MODELS)) {
    const rows = panel.filter((r) => r.model === m && (r.arm === NATIVE_ARM || r.arm === PTC_ARM))
    if (rows.length < 20) continue
    const raw = rawDifferential(panel, m)
    if (!raw) continue
    const lines = { model: m, label: MODELS[m].label, raw }
    let cellLog = 'refused', cellUsd = 'refused'
    try {
      const a = adjustedDifferential(rows, { scale: 'log', nativeMean: raw.nativeMean })
      lines.adjustedLog = a
      cellLog = fmt(a.pct).padStart(9) + ' [' + fmt(a.ciLoPct) + ', ' + fmt(a.ciHiPct) + ']'
    } catch (e) { lines.refusedLog = e.message }
    try {
      const a = adjustedDifferential(rows, { scale: 'usd', nativeMean: raw.nativeMean })
      lines.adjustedUsd = a
      cellUsd = fmt(a.pct).padStart(9) + ' [' + fmt(a.ciLoPct) + ', ' + fmt(a.ciHiPct) + ']'
    } catch (e) { lines.refusedUsd = e.message }
    out.push(lines)
    forScaleCheck.push({ label: MODELS[m].label, rows })
    console.log('  ' + MODELS[m].label.padEnd(20) +
      (fmt(raw.pct).padStart(9) + ' [' + fmt(raw.ciLoPct) + ', ' + fmt(raw.ciHiPct) + ']').padStart(22) + '  ' +
      cellLog.padStart(24) + '  ' + cellUsd.padStart(24))
  }
  console.log('')
  const blocks = pairedBlocks(panel.filter((r) => r.model === Object.keys(MODELS)[0]))
  if (blocks.length) {
    const a = out.find((o) => o.adjustedLog)
    if (a) console.log('  position pairs that identify f: ' + a.adjustedLog.positionPairs + ' distinct; ' +
      a.adjustedLog.ciReplicates + ' of ' + a.adjustedLog.iters + ' bootstrap replicates usable')
  }
  // WHICH SCALE THE DATA PREFER, out of sample. Both scales are asked to predict the same held-out
  // log ratio, because their own residuals are in different units and comparing those would decide
  // the question by the metric. A model the data cannot separate is reported as not separated.
  console.log('')
  console.log('  scale check - 8 folds held out by task, RMSE of the relative dollar error of the held-out')
  console.log('  block difference (lower is better; one seeded fold draw, not a distribution):')
  console.log('  ' + 'model'.padEnd(20) + 'log'.padStart(10) + 'usd'.padStart(10) + '   preferred')
  for (const s of forScaleCheck) {
    try {
      const cv = crossValidateScale(s.rows)
      const pref = cv.rmseLog < cv.rmseUsd ? 'log' : 'usd'
      const ratio = Math.max(cv.rmseLog, cv.rmseUsd) / Math.min(cv.rmseLog, cv.rmseUsd)
      console.log('  ' + s.label.padEnd(20) + cv.rmseLog.toFixed(4).padStart(10) + cv.rmseUsd.toFixed(4).padStart(10) +
        '   ' + pref + (ratio < 1.1 ? ' (marginal, x' + ratio.toFixed(2) + ')' : ' (x' + ratio.toFixed(2) + ')'))
      const at = out.find((o) => o.label === s.label)
      if (at) at.scaleCheck = { ...cv, preferred: pref, ratio }
    } catch (e) { console.log('  ' + s.label.padEnd(20) + '  not identified') }
  }
  if (process.argv.includes('--json')) {
    const p = process.argv[process.argv.indexOf('--json') + 1] ?? 'analysis/position-adjust.json'
    try { refuseFiledWrite(p, SELECTION) } catch (e) { refuse(e.message) }
    mkdirSync(p.split(/[\\/]/).slice(0, -1).join('/') || '.', { recursive: true })
    writeFileSync(p, JSON.stringify({ generated: new Date().toISOString(), datasets: SELECTION, models: out }, null, 1))
    console.log('wrote ' + p)
  }
}
