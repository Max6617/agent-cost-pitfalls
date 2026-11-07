/**
 * hard-analysis.mjs - the pre-registered analysis of the hard suite.
 *
 * Implements notes/plans/PRE-REGISTRATION-HARD.md (HARD-PREREG v1.0, committed 2026-10-05 at 8ec47c4)
 * and nothing else. The declared constants are exported in DECLARED so that a test can
 * assert each one equals the number written in the plan: a rule only the code can see is
 * a rule nothing can check.
 *
 *   node tools/hard-analysis.mjs                     # the pre-registered tables
 *   node tools/hard-analysis.mjs --json analysis/hard-suite-2026-10-05.json
 *
 * WHY THE STATISTICS LIVE HERE AND NOT IN stats.mjs: stats.mjs's clusterBootstrap is used
 * as-is (extended only with the percentile choice the equivalence test needs). The exact
 * Wilcoxon in hypotheses.mjs is private and hardcodes H2's one-sided tail, so this file
 * carries a general one, tested against brute-force enumeration in the .test file rather
 * than against the other implementation.
 */
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { cardFor } from './prices.mjs'
import { classifyRun } from './exclusions.mjs'
import { clusterBootstrap, bootstrapTaskMean, permutationP, holmFamily, mean } from './stats.mjs'
import { shuffleWith } from './rng.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '..')

export const DECLARED = {
  tasks: 24, arms: 10, cells: 240, records: 241, excludedRecords: 1,
  permutationIters: 20000, bootstrapIters: 5000, alpha: 0.05,
  hh1FloorPp: 10, equivalenceMarginPp: 10, hh3FloorPct: -10,
  discriminatingPp: 30, thresholdScore: 0.5, positionAsymmetryPp: 25,
  seed: 20261005,
}

const MODEL = 'deepseek-flash'
const readJsonl = (p) => existsSync(p)
  ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  : []
const cellKey = (r) => r.task + '|' + r.arm + '|' + r.seed

// ------------------------------------------------------------------ statistics

const binomialPmf = (k, n, p) => {
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c * Math.pow(p, k) * Math.pow(1 - p, n - k)
}

/**
 * Exact one-sided (or two-sided) Wilcoxon signed-rank, by DP over subset sums of the ranks.
 * Ranks are DOUBLED before the DP so that tie-averaged half-ranks stay integers: indexing a
 * typed array with 3.5 silently drops the term, which is the kind of defect this repository
 * keeps finding in its own machinery.
 */
export function wilcoxonExact(d, { alternative = 'two-sided' } = {}) {
  const nz = d.filter((x) => x !== 0)
  const n = nz.length
  if (!n) return { n: 0, W: 0, p: 1, method: 'exact-DP' }
  const abs = nz.map(Math.abs)
  const order = abs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0])
  const ranks = new Array(n).fill(0)
  let i = 0
  while (i < n) {
    let j = i
    while (j + 1 < n && order[j + 1][0] === order[i][0]) j++
    const avg = (i + j + 2) / 2
    for (let k = i; k <= j; k++) ranks[order[k][1]] = avg
    i = j + 1
  }
  const W = nz.reduce((s, v, idx) => s + (v > 0 ? ranks[idx] : 0), 0)
  const r2 = ranks.map((r) => Math.round(r * 2))
  const total = r2.reduce((a, b) => a + b, 0)
  let count = new Array(total + 1).fill(0)
  count[0] = 1
  for (const rk of r2) {
    const next = new Array(total + 1).fill(0)
    for (let k = 0; k <= total; k++) { if (!count[k]) continue; next[k] += count[k]; if (k + rk <= total) next[k + rk] += count[k] }
    count = next
  }
  const ways = Math.pow(2, n)
  const atLeast = (w) => { let s = 0; for (let k = Math.round(w * 2); k <= total; k++) s += count[k]; return s / ways }
  const atMost = (w) => { let s = 0; for (let k = 0; k <= Math.round(w * 2); k++) s += count[k]; return s / ways }
  const pGreater = atLeast(W)
  const pLess = atMost(W)
  const p = alternative === 'greater' ? pGreater : alternative === 'less' ? pLess : Math.min(1, 2 * Math.min(pGreater, pLess))
  return { n, W, p, method: 'exact-DP' }
}

/** Exact McNemar, two-sided, on the discordant pairs. n01/n10 are counts of tasks. */
export function mcnemarExact(n01, n10) {
  const m = n01 + n10
  if (!m) return { n: 0, p: 1, method: 'exact-binomial' }
  const k = Math.min(n01, n10)
  let tail = 0
  for (let i = 0; i <= k; i++) tail += binomialPmf(i, m, 0.5)
  return { n: m, n01, n10, p: Math.min(1, 2 * tail), method: 'exact-binomial' }
}

/** Wilson score interval, as analyze-results.mjs uses it. */
export function wilson(k, n) {
  if (!n) return [null, null]
  const z = 1.96, p = k / n
  const d = 1 + (z * z) / n, c = p + (z * z) / (2 * n)
  const h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))
  // CLAMPED: at k = 0 the closed form returns about -9e-7, and an interval that excludes 0 by
  // a rounding error is how a boundary cell becomes a finding. Caught by a test, not by review.
  return [Math.max(0, (c - h) / d), Math.min(1, (c + h) / d)]
}

/** Ranks with ties averaged. */
export function rankAverage(xs) {
  const idx = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0])
  const out = new Array(xs.length).fill(0)
  let i = 0
  while (i < xs.length) {
    let j = i
    while (j + 1 < xs.length && idx[j + 1][0] === idx[i][0]) j++
    const avg = (i + j + 2) / 2
    for (let k = i; k <= j; k++) out[idx[k][1]] = avg
    i = j + 1
  }
  return out
}

export function spearman(xs, ys) {
  const a = rankAverage(xs), b = rankAverage(ys)
  const ma = mean(a), mb = mean(b)
  let num = 0, da = 0, db = 0
  for (let i = 0; i < a.length; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2 }
  return da && db ? num / Math.sqrt(da * db) : NaN
}

/** Max-min arm solve rate in percentage points. `counts` are solved counts per arm. */
export function spreadPp(counts, nTasks) {
  if (!counts.length || !nTasks) return 0
  return (100 * (Math.max(...counts) - Math.min(...counts))) / nTasks
}

/** The classification tools/hardbatch.mjs uses, so the two tables can be read side by side. */
export function classifyTask({ solves, nArms, scoreMean }, { spread } = {}) {
  if (solves === nArms) return 'TOO EASY'
  if (solves === 0) return scoreMean != null && scoreMean >= DECLARED.thresholdScore ? 'THRESHOLD' : 'TOO HARD'
  const s = spread == null ? 100 : spread
  return s >= DECLARED.discriminatingPp ? 'DISCRIMINATING' : 'weak separation'
}

// ------------------------------------------------------------------ the cell rule

/**
 * One cell may hold more than one record: the pilot's reboot left a killed record and a retry
 * (PRE-REGISTRATION.md 12.9). Primary is the retry; `worstCase` is the killed record treated as
 * an unsolved cell, which is the pre-declared sensitivity. A solved record is never re-bucketed.
 */
export function cellValue(group) {
  const sorted = [...group].sort((a, b) => String(a.ts).localeCompare(String(b.ts)))
  const isExcluded = (r) => (r.__excluded === undefined ? classifyRun(r).infrastructure : r.__excluded)
  const usable = sorted.filter((r) => !isExcluded(r))
  const primary = usable.length ? usable[usable.length - 1] : sorted[sorted.length - 1]
  const killed = sorted.filter(isExcluded)
  const worst = killed.length && sorted.length > 1 ? killed[killed.length - 1] : primary
  return {
    record: primary,
    retryUsed: sorted.length > 1 && killed.length > 0 && primary !== worst,
    worstCase: { record: worst, solved: !!worst.solved, excluded: isExcluded(worst) },
  }
}

/** Per-task table: solves, spread, mean score, class. */
export function taskTable(rows, field = 'score') {
  const byTask = new Map()
  for (const r of rows) { if (!byTask.has(r.task)) byTask.set(r.task, []); byTask.get(r.task).push(r) }
  const out = []
  for (const [task, rs] of byTask) {
    const nArms = rs.length
    const solves = rs.filter((r) => r.solved).length
    const spread = spreadPp(rs.map((r) => (r.solved ? 1 : 0)), 1)
    const scores = rs.map((r) => r[field]).filter((v) => v != null)
    const scoreMean = scores.length ? mean(scores) : null
    out.push({ task, nArms, solves, spread, scoreMean, cls: classifyTask({ solves, nArms, scoreMean }, { spread }) })
  }
  out.sort((a, b) => b.spread - a.spread || (b.scoreMean ?? 0) - (a.scoreMean ?? 0) || a.task.localeCompare(b.task))
  return out
}

// ------------------------------------------------------------------ loading and pricing

let GW_CACHE = null
/** runId -> usage records, from every gateway log in results/. The pilot's usage is split
 *  across three logs, so a single-file read would silently under-price it. */
function gatewayIndex(gatewayDir) {
  if (GW_CACHE) return GW_CACHE
  const map = new Map()
  const files = readdirSync(gatewayDir).filter((f) => f.endsWith('-gateway.jsonl'))
  let probes = 0, badStatus = 0
  for (const f of files) {
    for (const u of readJsonl(join(gatewayDir, f))) {
      if (String(u.path ?? u.url ?? '').includes('/models')) { probes++; continue }
      if (u.status != null && Number(u.status) >= 400) badStatus++
      if (!u.runId) continue
      if (!map.has(u.runId)) map.set(u.runId, [])
      map.get(u.runId).push(u)
    }
  }
  GW_CACHE = { map, files: files.length, probes, badStatus }
  return GW_CACHE
}

/** cost_billed is re-derived from tokens at the corrected card - never read from a summary. */
export function costOf(usage) {
  const card = cardFor(MODEL, { required: true })
  let miss = 0, hit = 0, out = 0
  for (const u of usage) {
    const x = u.usage ?? {}
    const inTok = x.inputTokens ?? 0
    const h = x.cacheHitTokens ?? 0
    const m = x.cacheMissTokens ?? (inTok - h)
    hit += h; miss += Math.max(0, m); out += x.outputTokens ?? 0
  }
  return (miss / 1e6) * card.miss + (hit / 1e6) * card.hit + (out / 1e6) * card.out
}

const TASKSCORE = /TASKSCORE (\{.*\})/
/** The authored-denominator score from the grader's own line; null when the grader never ran. */
export function scoredFrom(record) {
  const m = TASKSCORE.exec(String(record.testOutputTail ?? ''))
  if (!m) return null
  try { const o = JSON.parse(m[1]); return o.authored ? o.pass / o.authored : null } catch { return null }
}

let PILOT_CACHE = null
export function loadPilot({ dir = join(repo, 'results', 'hardpilot-ds-full') } = {}) {
  if (PILOT_CACHE) return PILOT_CACHE
  const records = readJsonl(join(dir, 'runs.jsonl'))
  const gw = gatewayIndex(join(repo, 'results'))
  const byCause = {}
  let excludedRecords = 0, excludedCostUsd = 0
  const causeOf = new Map()
  for (const r of records) {
    const c = classifyRun(r)
    causeOf.set(r, c)
    if (c.infrastructure) {
      excludedRecords++
      byCause[c.cause] = (byCause[c.cause] ?? 0) + 1
      excludedCostUsd += costOf(gw.map.get(r.runId) ?? [])
    }
  }
  const groups = new Map()
  for (const r of records) { const k = cellKey(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r) }

  const usageJoinedRecords = records.filter((r) => gw.map.has(r.runId)).length
  const rows = [], worstRows = []
  let usageJoinedCells = 0, scoredCells = 0
  for (const [key, group] of groups) {
    const { record, retryUsed, worstCase } = cellValue(group)
    const build = (rec, isWorst) => {
      const usage = gw.map.get(rec.runId) ?? []
      const c = causeOf.get(rec)
      return {
        key, task: rec.task, arm: rec.arm, seed: rec.seed, runId: rec.runId,
        solved: !!rec.solved, score: scoredFrom(rec), passRate: typeof rec.passRate === 'number' ? rec.passRate : null,
        costUsd: costOf(usage), steps: usage.length, position: rec.position,
        exitCode: rec.exitCode, durationMs: rec.durationMs, retryUsed, worst: isWorst,
        excluded: !!(c && c.infrastructure), cause: c ? c.cause : null,
      }
    }
    const row = build(record, false)
    if (gw.map.has(record.runId)) usageJoinedCells++
    if (row.score != null) scoredCells++
    rows.push(row)
    worstRows.push(build(worstCase.record, true))
  }
  const cells = groups.size
  const retriedGroups = [...groups.values()].filter((g) => g.length > 1)

  // position diagnostic: is any arm's share of position 0 far from uniform?
  const arms = [...new Set(rows.map((r) => r.arm))].sort()
  const byArm = arms.map((arm) => {
    const rs = rows.filter((r) => r.arm === arm)
    const p0 = rs.filter((r) => r.position === 0).length
    return { arm, n: rs.length, position0: p0, share0: p0 / rs.length }
  })
  const uniform = 1 / arms.length
  const maxAbsDeviationPp = 100 * Math.max(...byArm.map((a) => Math.abs(a.share0 - uniform)))
  const position = { byArm, uniformShare0: uniform, maxAbsDeviationPp, rule: 'adjust if maxAbsDeviationPp > ' + DECLARED.positionAsymmetryPp }

  PILOT_CACHE = {
    rows, worstRows,
    flow: {
      records: records.length, cells, absentCells: Math.max(0, DECLARED.cells - cells),
      excludedRecords, excludedCostUsd, byCause, usageJoinedRecords, usageJoinedCells, scoredCells,
      arms: arms.length, tasks: new Set(rows.map((r) => r.task)).size,
      retriedCells: retriedGroups.length,
      retriedCellKeys: retriedGroups.map((g) => cellKey(g[0])).sort(),
      gatewayFiles: gw.files, gatewayProbes: gw.probes, gatewayBadStatus: gw.badStatus,
      solveCells: rows.filter((r) => r.solved).length,
    },
    position,
  }
  return PILOT_CACHE
}

export const POSITION_DIAGNOSTIC = {
  get byArm() { return loadPilot().position.byArm },
  get uniformShare0() { return loadPilot().position.uniformShare0 },
  get maxAbsDeviationPp() { return loadPilot().position.maxAbsDeviationPp },
  get rule() { return loadPilot().position.rule },
}

// ------------------------------------------------------------------ batch 1, the comparator

let B1_CACHE = null
/**
 * The signed-off batch-1 DeepSeek matrix, aggregated exactly as PRE-REGISTRATION.md section 3
 * says (per-run values averaged over seeds within each task x arm), priced from usage with the
 * same function. It exists so HH5/HH6 have a comparator, not to re-open any filed result.
 */
export function loadBatch1({ dir = join(repo, 'results', 'ds-full') } = {}) {
  if (B1_CACHE) return B1_CACHE
  const gw = gatewayIndex(join(repo, 'results'))
  const records = readJsonl(join(dir, 'runs.jsonl'))
  const kept = records.filter((r) => !classifyRun(r).infrastructure)
  const byCell = new Map()
  for (const r of kept) {
    const k = r.task + '|' + r.arm
    if (!byCell.has(k)) byCell.set(k, { task: r.task, arm: r.arm, costs: [], solved: [], steps: [] })
    const usage = gw.map.get(r.runId) ?? []
    const g = byCell.get(k)
    g.costs.push(costOf(usage)); g.steps.push(usage.length); g.solved.push(!!r.solved)
  }
  const rows = [...byCell.values()].map((g) => ({
    task: g.task, arm: g.arm, costUsd: mean(g.costs), steps: mean(g.steps),
    solved: g.solved.some(Boolean), solveRate: mean(g.solved.map(Number)), seeds: g.costs.length,
  }))
  B1_CACHE = {
    dir, records: records.length, excludedRecords: records.length - kept.length, cells: rows.length, rows,
    arms: [...new Set(rows.map((r) => r.arm))].length, tasks: [...new Set(rows.map((r) => r.task))].length,
    usageJoined: records.filter((r) => gw.map.has(r.runId)).length,
  }
  return B1_CACHE
}

// ------------------------------------------------------------------ the pre-registered tests

const armStats = (rows) => {
  const arms = [...new Set(rows.map((r) => r.arm))].sort()
  return arms.map((arm) => {
    const rs = rows.filter((r) => r.arm === arm)
    const solvedRows = rs.filter((r) => r.solved)
    const solved = solvedRows.length
    const scores = rs.map((r) => r.score).filter((v) => v != null)
    const prs = rs.map((r) => r.passRate).filter((v) => v != null)
    const [lo, hi] = wilson(solved, rs.length)
    const cost = rs.reduce((a, r) => a + r.costUsd, 0)
    return {
      arm, n: rs.length, solved, solveRate: solved / rs.length, solveCi: [lo, hi],
      meanScore: scores.length ? mean(scores) : null,
      meanPassRate: prs.length ? mean(prs) : null,
      meanCost: cost / rs.length, medianCost: median(rs.map((r) => r.costUsd)),
      meanCostSolved: solved ? mean(solvedRows.map((r) => r.costUsd)) : null,
      costPerSolved: solved ? cost / solved : null,
      medianSteps: median(rs.map((r) => r.steps)),
    }
  })
}

const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }

const paired = (rows, armA, armB, value) => {
  const byTask = new Map()
  for (const r of rows) { if (!byTask.has(r.task)) byTask.set(r.task, {}); byTask.get(r.task)[r.arm] = r }
  const out = []
  for (const [task, m] of byTask) {
    if (!m[armA] || !m[armB]) continue
    out.push({ task, a: value(m[armA]), b: value(m[armB]), d: value(m[armA]) - value(m[armB]) })
  }
  return out.sort((x, y) => x.task.localeCompare(y.task))
}

const cost = (r) => r.costUsd
const steps = (r) => r.steps

function hh1 (rows) {
  const arms = [...new Set(rows.map((r) => r.arm))].sort()
  const tasks = [...new Set(rows.map((r) => r.task))].sort()
  const matrix = tasks.map((task) => arms.map((arm) => (rows.find((r) => r.task === task && r.arm === arm)?.solved ? 1 : 0)))
  const observed = spreadOf(matrix, arms.length)
  const { p, se } = permutationP({
    observed,
    iters: DECLARED.permutationIters,
    seed: DECLARED.seed,
    replicate: (rnd) => spreadOf(matrix.map((block) => shuffleWith(block, rnd)), arms.length),
  })
  // DESCRIPTIVE, not a second test: the null's 95th percentile is the smallest spread this design
  // would have called significant. A null result is only informative with the resolution attached,
  // and 'no separation' without it invites the reader to assume the design could have seen one.
  const rnd = makeRngLocal(DECLARED.seed ^ 0x5f5f5f5f)
  const nulls = []
  for (let i = 0; i < DECLARED.permutationIters; i++) nulls.push(spreadOf(matrix.map((b) => shuffleWith(b, rnd)), arms.length))
  nulls.sort((a, b) => a - b)
  const criticalPp95 = nulls[Math.floor(0.95 * nulls.length)]
  return { id: 'HH1', observedPp: observed, p, se, iters: DECLARED.permutationIters, floorPp: DECLARED.hh1FloorPp, criticalPp95 }
}

const spreadOf = (matrix, nArms) => {
  const counts = new Array(nArms).fill(0)
  for (const block of matrix) for (let i = 0; i < nArms; i++) counts[i] += block[i]
  return spreadPp(counts, matrix.length)
}

function hh2 (rows) {
  const d = paired(rows, 'dsh:ptc', 'dsh:native', cost)
  const stat = (draw) => 100 * mean(draw.map((r) => r.d)) / mean(draw.map((r) => r.b))
  const ci95 = clusterBootstrap(d, stat, { iters: DECLARED.bootstrapIters, seed: DECLARED.seed })
  const ci90 = clusterBootstrap(d, stat, { iters: DECLARED.bootstrapIters, seed: DECLARED.seed, probs: [0.05, 0.95] })
  const estimate = stat(d)
  const m = DECLARED.equivalenceMarginPp
  // The committed plan expresses the equivalence decision as the 90% interval. The same decision
  // as a p-value is the bootstrap TOST p - the share of resamples beyond each margin - which is what
  // the four-test Holm family needs, and the two agree by construction (p < alpha <=> the 90% CI is
  // inside the margins). Both are reported.
  const draws = clusterBootstrap(d, stat, { iters: DECLARED.bootstrapIters, seed: DECLARED.seed, returnDraws: true }).draws
  const pBelow = draws.filter((v) => v <= -m).length / draws.length
  const pAbove = draws.filter((v) => v >= m).length / draws.length
  const tostP = Math.max(pBelow, pAbove)
  const verdict = ci90.lo > -m && ci90.hi < m ? 'EQUIVALENT'
    : ci95.lo > m ? 'PENALTY' : ci95.hi < -m ? 'ADVANTAGE' : 'INCONCLUSIVE'
  const ab = paired(rows, 'dsh:ptc', 'dsh:native', (r) => (r.solved ? 1 : 0))
  const n01 = ab.filter((r) => r.a === 1 && r.b === 0).length
  const n10 = ab.filter((r) => r.a === 0 && r.b === 1).length
  return { id: 'HH2', estimatePct: estimate, ci95: [ci95.lo, ci95.hi], ci90: [ci90.lo, ci90.hi], marginPp: m, verdict,
    p: tostP, tost: { pBelow, pAbove }, tasks: d.length, guard: mcnemarExact(n01, n10), meanD: mean(d.map((r) => r.d)) }
}

function hh3 (rows) {
  const byTask = new Map()
  for (const r of rows) { if (!byTask.has(r.task)) byTask.set(r.task, {}); byTask.get(r.task)[r.arm] = r }
  const per = []
  for (const [task, m] of byTask) {
    const need = ['dsh:ptc-terse', 'dsh:native-terse', 'dsh:ptc', 'dsh:native']
    if (!need.every((a) => m[a])) continue
    const terse = (m['dsh:ptc-terse'].costUsd + m['dsh:native-terse'].costUsd) / 2
    const base = (m['dsh:ptc'].costUsd + m['dsh:native'].costUsd) / 2
    per.push({ task, r: base > 0 ? (100 * (terse - base)) / base : null, terse, base })
  }
  const rs = per.filter((x) => x.r != null)
  const ci = bootstrapTaskMean(rs.map((x) => [x.task, x.r]), { iters: DECLARED.bootstrapIters, seed: DECLARED.seed })
  const w = wilcoxonExact(rs.map((x) => x.r), { alternative: 'less' })
  const estimate = mean(rs.map((x) => x.r))
  const verdict = w.p < DECLARED.alpha && estimate <= DECLARED.hh3FloorPct ? 'REPLICATED'
    : ci.lo > 0 ? 'CONTRADICTED' : 'INCONCLUSIVE'
  const nativeT = paired(rows, 'dsh:native-terse', 'dsh:native', (r) => (r.solved ? 1 : 0))
  const ptcT = paired(rows, 'dsh:ptc-terse', 'dsh:ptc', (r) => (r.solved ? 1 : 0))
  return {
    id: 'HH3', estimatePct: estimate, ci95: [ci.lo, ci.hi], floorPct: DECLARED.hh3FloorPct, verdict,
    wilcoxon: w, tasks: rs.length,
    guard: {
      native: mcnemarExact(nativeT.filter((x) => x.a === 1 && x.b === 0).length, nativeT.filter((x) => x.a === 0 && x.b === 1).length),
      ptc: mcnemarExact(ptcT.filter((x) => x.a === 1 && x.b === 0).length, ptcT.filter((x) => x.a === 0 && x.b === 1).length),
    },
  }
}

function hh4 (rows) {
  const d = paired(rows, 'dsh:native', 'dsh:ptc', steps)
  const ci = bootstrapTaskMean(d.map((x) => [x.task, x.d]), { iters: DECLARED.bootstrapIters, seed: DECLARED.seed })
  const w = wilcoxonExact(d.map((x) => x.d), { alternative: 'greater' })
  const verdict = w.p < DECLARED.alpha && ci.lo > 0 ? 'GENERALISES' : ci.hi < 0 ? 'CONTRADICTED' : 'INCONCLUSIVE'
  const opt = paired(rows, 'dsh:native-opt', 'dsh:ptc-opt', steps)
  return { id: 'HH4', estimate: mean(d.map((x) => x.d)), ci95: [ci.lo, ci.hi], verdict, wilcoxon: w, tasks: d.length, optEstimate: mean(opt.map((x) => x.d)), optWilcoxon: wilcoxonExact(opt.map((x) => x.d), { alternative: 'greater' }) }
}

function secondaryPairs (rows) {
  const rel = (armA, armB, direction) => {
    const c = paired(rows, armA, armB, cost)
    const stat = (draw) => 100 * mean(draw.map((r) => r.d)) / mean(draw.map((r) => r.b))
    const ci = clusterBootstrap(c, stat, { iters: DECLARED.bootstrapIters, seed: DECLARED.seed })
    return { estimate: stat(c), ci95: [ci.lo, ci.hi], tasks: c.length,
      p: wilcoxonExact(c.map((r) => r.d), { alternative: direction }).p }
  }
  // S1 is HH2's contrast under the other policy, so it carries HH2's rule - an equivalence test -
  // not a one-sided penalty test. The first run used the wrong rule here; the defect, the diff and
  // the re-run are recorded in notes/records/HARD-SUITE-2026-10-05.md.
  const c = paired(rows, 'dsh:ptc-opt', 'dsh:native-opt', cost)
  const cStat = (draw) => 100 * mean(draw.map((r) => r.d)) / mean(draw.map((r) => r.b))
  const cM = DECLARED.equivalenceMarginPp
  const c95 = clusterBootstrap(c, cStat, { iters: DECLARED.bootstrapIters, seed: DECLARED.seed })
  const c90 = clusterBootstrap(c, cStat, { iters: DECLARED.bootstrapIters, seed: DECLARED.seed, probs: [0.05, 0.95] })
  const cDraws = clusterBootstrap(c, cStat, { iters: DECLARED.bootstrapIters, seed: DECLARED.seed, returnDraws: true }).draws
  const s2 = rel('dsh:native-terse', 'dsh:native', 'less')
  const s3 = rel('dsh:ptc-terse', 'dsh:ptc', 'less')
  return [
    { id: 'S1', label: 'ptc-opt - native-opt (cost %, equivalence)', estimate: cStat(c), ci95: [c95.lo, c95.hi], ci90: [c90.lo, c90.hi], tasks: c.length,
      verdict: c90.lo > -cM && c90.hi < cM ? 'EQUIVALENT' : c95.lo > cM ? 'PENALTY' : c95.hi < -cM ? 'ADVANTAGE' : 'INCONCLUSIVE',
      p: Math.max(cDraws.filter((v) => v <= -cM).length / cDraws.length, cDraws.filter((v) => v >= cM).length / cDraws.length) },
    { id: 'S2', label: 'native-terse - native (cost %)', ...s2 },
    { id: 'S3', label: 'ptc-terse - ptc (cost %)', ...s3 },
  ]
}

// ---- HH5-HH8: exploratory, labelled exploratory wherever they appear ----

/** HH5 - does the arm cost ranking transfer from batch 1 to the hard stratum? */
export function hh5 (rows, b1) {
  const arms = [...new Set(rows.map((r) => r.arm))].filter((a) => b1.rows.some((r) => r.arm === a)).sort()
  const hard = arms.map((a) => median(rows.filter((r) => r.arm === a).map((r) => r.costUsd)))
  const base = arms.map((a) => median(b1.rows.filter((r) => r.arm === a).map((r) => r.costUsd)))
  const rho = spearman(base, hard)
  const { p, se } = permutationP({ observed: Math.abs(rho), iters: DECLARED.permutationIters, seed: DECLARED.seed,
    replicate: (rnd) => Math.abs(spearman(shuffleWith(base, rnd), hard)) })
  const order = (xs) => arms.map((a, i) => [a, xs[i]]).sort((x, y) => x[1] - y[1]).map((x) => x[0])
  return { id: 'HH5', arms, rho, p, se, batch1Order: order(base), hardOrder: order(hard),
    batch1Median: base, hardMedian: hard }
}

/** HH6 - how much more does a hard cell cost? Ratio of medians, task bootstrap. */
export function hh6 (rows, b1) {
  const ratio = median(rows.map((r) => r.costUsd)) / median(b1.rows.map((r) => r.costUsd))
  const tasksOf = (rs) => [...new Set(rs.map((r) => r.task))]
  const rnd = makeRngLocal(DECLARED.seed)
  const hardTasks = tasksOf(rows), baseTasks = tasksOf(b1.rows)
  const draws = []
  const pickMedian = (rs, tasks) => {
    const vals = []
    for (const t of tasks) vals.push(...rs.filter((r) => r.task === t).map((r) => r.costUsd))
    return median(vals)
  }
  for (let i = 0; i < DECLARED.bootstrapIters; i++) {
    const hs = Array.from({ length: hardTasks.length }, () => hardTasks[Math.floor(rnd() * hardTasks.length)])
    const bs = Array.from({ length: baseTasks.length }, () => baseTasks[Math.floor(rnd() * baseTasks.length)])
    const h = pickMedian(rows, hs), b = pickMedian(b1.rows, bs)
    if (b > 0) draws.push(h / b)
  }
  draws.sort((a, b) => a - b)
  const q = (p) => draws[Math.min(draws.length - 1, Math.floor(p * draws.length))]
  return { id: 'HH6', ratio, ci95: [q(0.025), q(0.975)], hardMedian: median(rows.map((r) => r.costUsd)),
    batch1Median: median(b1.rows.map((r) => r.costUsd)), hardTasks: hardTasks.length, batch1Tasks: baseTasks.length }
}

/** HH7 - does the binary verdict separate arms that partial credit does not (F18)? */
export function hh7 (arms, field = 'meanScore') {
  const solveSpread = 100 * (Math.max(...arms.map((a) => a.solveRate)) - Math.min(...arms.map((a) => a.solveRate)))
  const scoreSpread = 100 * (Math.max(...arms.map((a) => a[field])) - Math.min(...arms.map((a) => a[field])))
  const rho = spearman(arms.map((a) => a.solveRate), arms.map((a) => a[field]))
  return { id: 'HH7', solveSpreadPp: solveSpread, scoreSpreadPp: scoreSpread,
    ratio: scoreSpread > 0 ? solveSpread / scoreSpread : null, rho,
    descriptorHolds: scoreSpread > 0 && solveSpread >= 2 * scoreSpread }
}

/** HH8 - the four external harnesses on hard tasks. Descriptive only. */
export function hh8 (arms) {
  return { id: 'HH8', rows: arms.filter((a) => !a.arm.startsWith('dsh:')) }
}

/** The batch-1 comparator for HH2 and HH4, computed with the same estimator. */
export function batch1Comparators (b1) {
  const pr = (a, b, value) => {
    const byTask = new Map()
    for (const r of b1.rows) { if (!byTask.has(r.task)) byTask.set(r.task, {}); byTask.get(r.task)[r.arm] = r }
    const out = []
    for (const [task, m] of byTask) if (m[a] && m[b]) out.push({ task, a: value(m[a]), b: value(m[b]), d: value(m[a]) - value(m[b]) })
    return out.sort((x, y) => x.task.localeCompare(y.task))
  }
  const c = pr('dsh:ptc', 'dsh:native', cost)
  const s = pr('dsh:native', 'dsh:ptc', steps)
  const cStat = (draw) => 100 * mean(draw.map((r) => r.d)) / mean(draw.map((r) => r.b))
  const cCI = clusterBootstrap(c, cStat, { iters: DECLARED.bootstrapIters, seed: DECLARED.seed })
  const sCI = bootstrapTaskMean(s.map((x) => [x.task, x.d]), { iters: DECLARED.bootstrapIters, seed: DECLARED.seed })
  return {
    ptcPct: cStat(c), ptcCi95: [cCI.lo, cCI.hi], ptcTasks: c.length,
    steps: mean(s.map((x) => x.d)), stepsCi95: [sCI.lo, sCI.hi], stepTasks: s.length,
  }
}

// A local stream, so this file still owns no module-level RNG state.
function makeRngLocal (seed) {
  let a = (seed >>> 0) || 1
  return function next () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export { armStats, paired, median, hh1, hh2, hh3, hh4, secondaryPairs }

// ------------------------------------------------------------------ main

function analyse (dir) {
  const p = loadPilot({ dir })
  const rows = p.rows
  const arms = armStats(rows)
  const tasks = taskTable(rows)
  const worstRows = p.worstRows
  const b1 = loadBatch1()
  const confirmatory = [hh1(rows), hh2(rows), hh3(rows), hh4(rows)]
  const holm = holmFamily(confirmatory.map((h) => ({ id: h.id, p: h.p ?? h.wilcoxon?.p ?? 1, se: h.se })), { alpha: DECLARED.alpha })
  const secondary = secondaryPairs(rows)
  const secondaryHolm = holmFamily(secondary.map((s) => ({ id: s.id, p: s.p })), { alpha: DECLARED.alpha })
  return {
    plan: 'PRE-REGISTRATION-HARD.md (HARD-PREREG v1.0, commit 8ec47c4)',
    dir, flow: p.flow, position: p.position, arms, tasks, confirmatory, holm,
    secondary: secondary.map((s, i) => ({ ...s, holm: secondaryHolm.rows.find((r) => r.id === s.id) })),
    batch1: { dir: b1.dir, records: b1.records, cells: b1.cells, arms: b1.arms, tasks: b1.tasks,
      excludedRecords: b1.excludedRecords, usageJoined: b1.usageJoined, comparators: batch1Comparators(b1) },
    exploratory: { HH5: hh5(rows, b1), HH6: hh6(rows, b1), HH7: hh7(arms), HH8: hh8(arms) },
    sensitivityScore: {
      table: taskTable(rows, 'passRate'),
      hh7: hh7(arms, 'meanPassRate'),
      classesDiffer: taskTable(rows, 'passRate').filter((t, i) => t.cls !== tasks[i].cls).length,
      meanScorePp: 100 * mean(arms.map((a) => a.meanScore)),
      meanPassRatePp: 100 * mean(arms.map((a) => a.meanPassRate)),
    },
    worstCase: { solves: worstRows.filter((r) => r.solved).length, spreadPp: spreadPp(armStats(worstRows).map((a) => a.solved), DECLARED.tasks) },
    spentUsd: rows.reduce((a, r) => a + r.costUsd, 0),
  }
}

const pct = (x, d = 2) => (x == null || !Number.isFinite(x) ? 'n/a' : x.toFixed(d))

function print (r) {
  const L = []
  const say = (...xs) => { for (const x of xs) L.push(x) }
  say('HARD-SUITE ANALYSIS - ' + r.plan)
  say('')
  say('FLOW')
  say('  records ' + r.flow.records + ' -> excluded ' + r.flow.excludedRecords + ' ' + JSON.stringify(r.flow.byCause) +
      ' -> cells ' + r.flow.cells + ' (absent ' + r.flow.absentCells + ', retried ' + r.flow.retriedCells + ')')
  say('  usage joined ' + r.flow.usageJoinedRecords + '/' + r.flow.records + ' records (' + r.flow.usageJoinedCells + '/' + r.flow.cells + ' cells priced) across ' + r.flow.gatewayFiles + ' gateway logs; scored cells ' + r.flow.scoredCells)
  say('  excluded records carry $' + pct(r.flow.excludedCostUsd, 4) + ' of real spend that no arm table uses')
  say('  cells solved ' + r.flow.solveCells + '/' + r.flow.cells + '; billed $' + pct(r.spentUsd, 4) + ' (re-derived from tokens)')
  say('')
  say('ARMS')
  say('  ' + 'arm'.padEnd(18) + 'solved'.padStart(7) + 'rate'.padStart(8) + '95% CI'.padStart(14) + 'meanScore'.padStart(11) + 'meanCost'.padStart(10) + 'cost/solved'.padStart(13) + 'medSteps'.padStart(9))
  for (const a of r.arms) say('  ' + a.arm.padEnd(18) + (a.solved + '/' + a.n).padStart(7) + (100 * a.solveRate).toFixed(1).padStart(7) + '%' +
      ((100 * a.solveCi[0]).toFixed(0) + '-' + (100 * a.solveCi[1]).toFixed(0) + '%').padStart(14) +
      (a.meanScore == null ? 'n/a' : (100 * a.meanScore).toFixed(1) + '%').padStart(11) +
      ('$' + a.meanCost.toFixed(4)).padStart(10) + (a.costPerSolved == null ? 'n/a' : '$' + a.costPerSolved.toFixed(4)).padStart(13) +
      String(a.medianSteps).padStart(9))
  say('')
  say('CONFIRMATORY FAMILY (Holm, alpha ' + DECLARED.alpha + ')')
  for (const h of r.confirmatory) {
    if (h.id === 'HH1') say('  HH1 arm separation      S = ' + pct(h.observedPp, 1) + 'pp   p = ' + pct(h.p, 5) + ' (se ' + pct(h.se, 5) + ')   floor ' + h.floorPp + 'pp' +
      '   smallest detectable spread ' + pct(h.criticalPp95, 1) + 'pp')
    if (h.id === 'HH2') say('  HH2 PTC differential    D = ' + pct(h.estimatePct) + '%   95% [' + pct(h.ci95[0]) + ', ' + pct(h.ci95[1]) + ']   90% [' + pct(h.ci90[0]) + ', ' + pct(h.ci90[1]) + ']   margin +/-' + h.marginPp + 'pp   ' + h.verdict)
    if (h.id === 'HH3') say('  HH3 terseness           R = ' + pct(h.estimatePct) + '%   95% [' + pct(h.ci95[0]) + ', ' + pct(h.ci95[1]) + ']   p = ' + pct(h.wilcoxon.p, 5) + '   floor ' + h.floorPct + '%   ' + h.verdict)
    if (h.id === 'HH4') say('  HH4 requests (native-ptc) d = ' + pct(h.estimate) + '   95% [' + pct(h.ci95[0]) + ', ' + pct(h.ci95[1]) + ']   p = ' + pct(h.wilcoxon.p, 5) + '   ' + h.verdict)
  }
  say('  Holm: ' + r.holm.survivors + '/' + r.holm.m + ' survive; ' + r.holm.unresolvable + ' unresolvable at this simulation size')
  say('')
  say('SECONDARY FAMILY (Holm, alpha ' + DECLARED.alpha + ')')
  for (const s of r.secondary) say('  ' + s.label.padEnd(40) + pct(s.estimate).padStart(9) + '%   p = ' + pct(s.p, 5) +
      '   95% [' + pct(s.ci95[0]) + ', ' + pct(s.ci95[1]) + ']' + (s.verdict ? '   ' + s.verdict : '') + '   ' + (s.holm?.passes ? 'survives' : 'does not survive'))
  say('')
  say('BATCH-1 COMPARATOR (results/ds-full, same estimator)')
  say('  ' + r.batch1.records + ' records, ' + r.batch1.cells + ' cells, ' + r.batch1.tasks + ' tasks, ' + r.batch1.arms + ' arms, ' + r.batch1.excludedRecords + ' infrastructure-excluded')
  say('  PTC - native, hard ' + pct(r.confirmatory.find((h) => h.id === 'HH2').estimatePct) + '%   vs batch 1 ' +
      pct(r.batch1.comparators.ptcPct) + '% [' + pct(r.batch1.comparators.ptcCi95[0]) + ', ' + pct(r.batch1.comparators.ptcCi95[1]) + '] on ' + r.batch1.comparators.ptcTasks + ' tasks')
  say('  native - ptc steps, hard ' + pct(r.confirmatory.find((h) => h.id === 'HH4').estimate) + '   vs batch 1 ' +
      pct(r.batch1.comparators.steps) + ' [' + pct(r.batch1.comparators.stepsCi95[0]) + ', ' + pct(r.batch1.comparators.stepsCi95[1]) + ']')
  say('')
  say('EXPLORATORY (labelled exploratory; no confirmatory language)')
  const e5 = r.exploratory.HH5, e6 = r.exploratory.HH6, e7 = r.exploratory.HH7
  say('  HH5 ranking transfer    Spearman rho = ' + pct(e5.rho, 3) + '  permutation p = ' + pct(e5.p, 4))
  say('      batch 1 order: ' + e5.batch1Order.join(' < '))
  say('      hard    order: ' + e5.hardOrder.join(' < '))
  say('  HH6 cost scaling        hard median $' + pct(e6.hardMedian, 4) + ' vs batch 1 $' + pct(e6.batch1Median, 4) +
      '  ratio ' + pct(e6.ratio, 2) + 'x  95% [' + pct(e6.ci95[0], 2) + ', ' + pct(e6.ci95[1], 2) + ']')
  say('  HH7 partial credit      solve spread ' + pct(e7.solveSpreadPp, 1) + 'pp vs score spread ' + pct(e7.scoreSpreadPp, 1) + 'pp' +
      '  ratio ' + pct(e7.ratio, 2) + '  rho ' + pct(e7.rho, 3) + '  descriptor holds: ' + e7.descriptorHolds)
  say('  HH8 external harnesses (descriptive)')
  for (const a of r.exploratory.HH8.rows) say('      ' + a.arm.padEnd(12) + (a.solved + '/' + a.n).padStart(6) + ' solved   score ' +
      (a.meanScore == null ? 'n/a' : (100 * a.meanScore).toFixed(1) + '%').padStart(6) + '   mean $' + a.meanCost.toFixed(4) +
      '   per solved ' + (a.costPerSolved == null ? 'n/a' : '$' + a.costPerSolved.toFixed(4)) + '   medSteps ' + a.medianSteps)
  say('')
  say('PER-TASK TABLE (same classes as tools/hardbatch.mjs)')
  say('  ' + 'task'.padEnd(34) + 'solved'.padStart(8) + 'spread'.padStart(8) + 'meanScore'.padStart(11) + '   class')
  for (const t of r.tasks) say('  ' + t.task.padEnd(34) + (t.solves + '/' + t.nArms).padStart(8) + (pct(t.spread, 0) + 'pp').padStart(8) +
      (t.scoreMean == null ? 'n/a' : (100 * t.scoreMean).toFixed(1) + '%').padStart(11) + '   ' + t.cls)
  const count = (c) => r.tasks.filter((t) => t.cls === c).length
  say('  DISCRIMINATING ' + count('DISCRIMINATING') + '/' + r.tasks.length + '   too easy ' + count('TOO EASY') + '   too hard ' + count('TOO HARD') +
      '   threshold ' + count('THRESHOLD') + '   weak ' + count('weak separation'))
  say('')
  say('SENSITIVITY A (worst case: the killed record instead of the retry)')
  say('  cells solved ' + r.worstCase.solves + ' (primary ' + r.flow.solveCells + ')   arm spread ' + pct(r.worstCase.spreadPp, 1) + 'pp')
  say('')
  say('SENSITIVITY B (node passRate instead of the authored denominator)')
  say('  mean score ' + pct(r.sensitivityScore.meanScorePp, 1) + '% (authored) vs ' + pct(r.sensitivityScore.meanPassRatePp, 1) + '% (node)   task classes that change: ' + r.sensitivityScore.classesDiffer + '/' + r.tasks.length)
  say('  HH7 descriptor under passRate: solve spread ' + pct(r.sensitivityScore.hh7.solveSpreadPp, 1) + 'pp vs score spread ' + pct(r.sensitivityScore.hh7.scoreSpreadPp, 1) + 'pp  holds: ' + r.sensitivityScore.hh7.descriptorHolds)
  say('')
  say('SENSITIVITY C (intention-to-treat cost vs solved-only cost, per arm)')
  for (const a of r.arms) say('  ' + a.arm.padEnd(18) + 'all cells $' + a.meanCost.toFixed(4) + '   solved only ' + (a.meanCostSolved == null ? 'n/a' : '$' + a.meanCostSolved.toFixed(4)) + '   (n solved ' + a.solved + ')')
  say('')
  say('POSITION DIAGNOSTIC (F45)')
  say('  ' + r.position.rule + '   observed max |share0 - uniform| = ' + pct(r.position.maxAbsDeviationPp, 1) + 'pp')
  for (const a of r.position.byArm) say('    ' + a.arm.padEnd(18) + 'position 0 in ' + String(a.position0).padStart(2) + '/' + a.n + '  (' + (100 * a.share0).toFixed(0) + '%)')
  return L.join('\n')
}

export { analyse, print }

// Import-safe: the analysis runs only when this file is the entry point. The first version ran it
// at import time, so importing the module in a test executed the whole pipeline - and when S2/S3
// later gained no CI, the test file failed with a module-level TypeError instead of a test failure.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const argv = process.argv.slice(2)
  const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
  const jsonOut = opt('--json', null)
  const dir = opt('--dir', join(repo, 'results', 'hardpilot-ds-full'))
  const result = analyse(dir)
  console.log(print(result))
  if (jsonOut) {
    mkdirSync(dirname(jsonOut), { recursive: true })
    writeFileSync(jsonOut, JSON.stringify({ ...result, generated: new Date().toISOString() }, null, 2))
    console.log('\nwrote ' + jsonOut)
  }
}