/**
 * stats.mjs - the study's resampling statistics, in ONE place.
 *
 * WHY THIS EXISTS
 * ---------------
 * Two tools implemented the cluster bootstrap independently, and they disagreed in the one way
 * that matters: tools/hypotheses.mjs held a single MODULE-LEVEL stream (\`const rnd =
 * makeRng(20261001)\`) under a comment claiming it had been given a fresh stream per call, so
 * every interval it printed depended on how many draws had happened before it. tools/
 * panel-analysis.mjs had already been fixed; the comment in hypotheses.mjs was the lie, not the
 * code, and no output test could catch it.
 *
 * The same file also owns Holm-Bonferroni, because the correction is only meaningful if the
 * FAMILY is defined in one place and visibly (PRE-REGISTRATION.md section 6: "All secondary and
 * pairwise contrasts receive Holm-Bonferroni correction across the family reported together").
 *
 * TWO RULES FOR ANYTHING ADDED HERE
 *  1. Every stochastic function builds its OWN stream from its own seed. No module-level state,
 *     ever: the property that has to hold is "this contrast's number does not depend on what was
 *     computed before it".
 *  2. Every p-value carries its Monte Carlo standard error, so a verdict that turns on a
 *     difference smaller than the simulation noise is visible rather than reported.
 */
import { makeRng } from './rng.mjs'

export function mean(xs) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN }

/**
 * Cluster bootstrap by task: resample TASKS with replacement, keep every row inside a resampled
 * task. `rows` carry `.task`; `statistic(draw)` returns the number to bootstrap.
 *
 * A FRESH stream per call, derived from `seed`. Deterministic for a given (rows, statistic,
 * iters, seed), and independent of every other call in the process.
 *
 * B = 200,000, NOT 5,000, and the reason is a defect rather than a preference (found 2026-10-09 by a
 * hostile review, reproduced independently here). At B = 5,000 the percentile endpoints carry visible
 * Monte Carlo error: batch-1 Sonnet's A2 lower bound sat at +0.28% - a results-table row excluding
 * zero - while landing BELOW zero in 25 of 40 reseeds at the same B (sd of the bound 0.21pp). At
 * B = 200,000 the same interval is [-0.08, +18.01], and at B = 2,000,000 [-0.07, +18.01]: the
 * estimand contains zero. The study's own sign-flip test (p = 0.0512, reported WITH its Monte Carlo
 * error) agreed with the large-B interval all along.
 *
 * Raising B also settles the replication verdict's knife edge rather than merely shrinking it:
 * GLM's tasks-b upper bound is +0.04pp at B = 5,000 and +0.14pp at B = 200,000, and across 20 seeds
 * at the larger B the pre-registered R1 is 0 of 4 in 20 of 20 - it is no longer seed-decided.
 *
 * The blast radius of the change was measured before it was made: of the twelve model x suite
 * contrasts the paper reports, exactly ONE classification moves (batch-1 Sonnet, positive -> null)
 * and none moves in tasks-b.
 */
export function clusterBootstrap(rows, statistic, { iters = 200000, seed = 12345, probs = [0.025, 0.975], returnDraws = false } = {}) {
  const rnd = makeRng(seed)
  const byTask = new Map()
  for (const r of rows) {
    if (!byTask.has(r.task)) byTask.set(r.task, [])
    byTask.get(r.task).push(r)
  }
  const tasks = [...byTask.values()]
  if (!tasks.length) return { lo: null, hi: null, n: 0, iters }
  const vals = []
  for (let i = 0; i < iters; i++) {
    const draw = []
    for (let j = 0; j < tasks.length; j++) draw.push(...tasks[Math.floor(rnd() * tasks.length)])
    const v = statistic(draw)
    if (Number.isFinite(v)) vals.push(v)
  }
  vals.sort((a, b) => a - b)
  // `probs` exists because an EQUIVALENCE test needs a 90% interval while a significance test
  // needs 95%, and an ignored option is worse than no option: the caller would have silently got
  // the 95% interval, and a TOST verdict decided by the wrong interval is a wrong verdict.
  const pick = (p) => vals[Math.min(vals.length - 1, Math.max(0, Math.floor(p * vals.length)))]
  // `probs` is deliberately NOT echoed into the returned object: these intervals are recorded in
  // analysis/*.json, and a new key here changes every regenerated output in the repository.
  const out = { lo: pick(probs[0]), hi: pick(probs[1]), n: vals.length, iters }
  // `draws` is for the one thing a pair of percentiles cannot answer: a bootstrap TOST p-value,
  // which is the share of resamples beyond a margin rather than a quantile of them.
  if (returnDraws) out.draws = vals
  return out
}

/**
 * The paired-difference case: one value per task. Identical arithmetic to clusterBootstrap over
 * those same tasks, with the adapter written once instead of at every call site.
 */
export function bootstrapTaskMean(diffsByTask, opts = {}) {
  const rows = [...diffsByTask].map(([task, v]) => ({ task, v }))
  return clusterBootstrap(rows, (draw) => mean(draw.map((x) => x.v)), opts)
}

/**
 * Permutation null for a statistic over independent random permutations.
 *
 * Used by the A1b ranking null ("if a provider left no fingerprint, each model's ordering of the
 * arms is an independent random permutation"). The stream is built here, so the tool that calls
 * this holds no state and its p cannot depend on what ran before it.
 *
 * `replicate(rnd)` performs one replicate using the supplied stream and returns the statistic.
 * `shuffleWith` from rng.mjs is the intended companion for order statistics.
 */
export function permutationP({ observed, replicate, iters = 20000, seed = 12345 } = {}) {
  const rnd = makeRng(seed)
  let ge = 0
  for (let i = 0; i < iters; i++) if (replicate(rnd) >= observed) ge++
  const p = (ge + 1) / (iters + 1)
  return { p, se: Math.sqrt((p * (1 - p)) / iters), iters }
}

/**
 * Sign-flip permutation p-value for a one-sample contrast (H0: mean = 0).
 *
 * Fresh stream per call from `seed`, so one contrast's p does not depend on how many contrasts
 * were tested before it - the A2b table used to share one stream across the whole family and was
 * therefore order-dependent. Returns the Monte Carlo standard error with the p, because at 20,000
 * draws the error near p = 0.01 is about 0.0007: larger than the gap between neighbouring Holm
 * thresholds, which means a verdict there is simulation noise rather than evidence.
 */
export function signFlipP(values, { iters = 200000, seed = 0x4a17b3c9 } = {}) {
  const rnd = makeRng(seed)
  const obs = Math.abs(mean(values))
  if (!values.length) return { p: 1, se: 0, iters }
  let ge = 0
  for (let i = 0; i < iters; i++) {
    let s = 0
    for (const v of values) s += rnd() < 0.5 ? -v : v
    if (Math.abs(s / values.length) >= obs) ge++
  }
  const p = (ge + 1) / (iters + 1)
  return { p, se: Math.sqrt((p * (1 - p)) / iters), iters }
}

/**
 * Holm-Bonferroni STEP-DOWN over one family.
 *
 * `tests` is every secondary/pairwise contrast reported together, each `{ id, label, p }`.
 * Sorted ascending, the i-th is compared against alpha/(m-i+1); the procedure STOPS at the first
 * failure, so the rejected set is always a prefix. The previous implementation compared every
 * p against its own threshold and never stopped, which can pass a test whose predecessor failed -
 * not Holm at all, and it made the family's verdicts non-monotone.
 *
 * `resolvable` is false when the p sits within 2 Monte Carlo standard errors of its own
 * threshold: a verdict there is a coin flip in the simulation, not a finding.
 */
export function holmFamily(tests, { alpha = 0.05 } = {}) {
  const sorted = [...tests].sort((a, c) => a.p - c.p)
  const m = sorted.length
  const rows = []
  let stopped = false
  for (let i = 0; i < m; i++) {
    const t = sorted[i]
    const threshold = alpha / (m - i)
    const passes = !stopped && t.p < threshold
    if (!passes) stopped = true
    const se = Number.isFinite(t.se) ? t.se : null
    rows.push({ ...t, rank: i + 1, threshold, passes, mcSe: se, resolvable: se == null ? null : Math.abs(t.p - threshold) > 2 * se })
  }
  return { alpha, m, rows, survivors: rows.filter((r) => r.passes).length, unresolvable: rows.filter((r) => r.resolvable === false).length }
}
