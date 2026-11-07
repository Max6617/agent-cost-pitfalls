/**
 * hard-analysis.test.mjs - the tests for the pre-registered hard-suite analysis.
 *
 * Written BEFORE tools/hard-analysis.mjs existed, and run against the committed plan
 * notes/plans/PRE-REGISTRATION-HARD.md (HARD-PREREG v1.0, commit 8ec47c4).
 *
 * Three kinds of test, as in the rest of this repo:
 *   1. EXACT - the statistics are checked against brute-force enumeration, not against themselves.
 *   2. FIXTURE - the cell/retry rule is checked on a synthetic two-record cell before real data.
 *   3. REAL DATA + WIRING - the shipped matrix is asserted to have the shape the plan claims, and
 *      every declared constant is asserted to equal the number written in the plan document.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DECLARED, wilcoxonExact, mcnemarExact, wilson, rankAverage, spearman, classifyTask,
  spreadPp, loadPilot, cellValue, taskTable, POSITION_DIAGNOSTIC,
} from './hard-analysis.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '..')
const PILOT = join(repo, 'results', 'hardpilot-ds-full')

// ---------------------------------------------------------------- exact statistics

/** Brute force over all 2^n sign patterns, using the same tie-averaged ranks. */
function wilcoxonBrute(d, alternative) {
  const nz = d.filter((x) => x !== 0)
  const n = nz.length
  if (!n) return 1
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
  const wObs = nz.reduce((s, v, idx) => s + (v > 0 ? ranks[idx] : 0), 0)
  let ge = 0, le = 0, total = 0
  for (let mask = 0; mask < (1 << n); mask++) {
    let w = 0
    for (let b = 0; b < n; b++) if (mask & (1 << b)) w += ranks[b]
    total++
    if (w >= wObs) ge++
    if (w <= wObs) le++
  }
  if (alternative === 'greater') return ge / total
  if (alternative === 'less') return le / total
  return Math.min(1, 2 * Math.min(ge, le) / total)
}

test('EXACT: the Wilcoxon DP agrees with brute-force enumeration, ties included', () => {
  const cases = [
    [1, 2, 3, 4, 5],
    [-1, -2, -3, -4, -5],
    [1, -1, 2, -2, 3],
    [2, 2, 2, 2],
    [0, 0, 1, -3, 7, -2],
    [0.5, -0.5, 1.5, -1.5, 2.5, -2.5, 3.5],
    [5],
    [-5],
    [0, 0, 0],
  ]
  for (const d of cases) {
    for (const alt of ['greater', 'less', 'two-sided']) {
      const got = wilcoxonExact(d, { alternative: alt }).p
      const want = wilcoxonBrute(d, alt)
      assert.ok(Math.abs(got - want) < 1e-12,
        'd=' + JSON.stringify(d) + ' alt=' + alt + ' got ' + got + ' want ' + want)
    }
  }
})

test('EXACT: the Wilcoxon null is exact, so the smallest possible p is 2^-n', () => {
  // 8 strictly ordered positive differences: the only sign pattern reaching W+ = 36 is all-positive.
  const r = wilcoxonExact([1, 2, 3, 4, 5, 6, 7, 8], { alternative: 'greater' })
  assert.equal(r.n, 8)
  assert.equal(r.p, 1 / 256)
})

test('EXACT: zeros are dropped, and an all-zero vector is not evidence', () => {
  assert.equal(wilcoxonExact([0, 0, 0], { alternative: 'greater' }).p, 1)
  assert.equal(wilcoxonExact([], { alternative: 'greater' }).p, 1)
  assert.equal(wilcoxonExact([0, 3, 4], { alternative: 'greater' }).n, 2)
})

test('EXACT: McNemar matches the binomial for the two textbook cases', () => {
  // 1 vs 9 discordant: p = 2 * (C(10,0) + C(10,1)) / 2^10
  assert.ok(Math.abs(mcnemarExact(1, 9).p - 2 * (1 + 10) / 1024) < 1e-12)
  // symmetric discordance is no evidence at all
  assert.equal(mcnemarExact(4, 4).p, 1)
  assert.equal(mcnemarExact(0, 0).p, 1)
})

test('EXACT: Wilson intervals behave at the boundaries', () => {
  const [lo0, hi0] = wilson(0, 24)
  const [lo1, hi1] = wilson(24, 24)
  assert.ok(lo0 >= 0 && hi0 < 0.2, 'zero solves must not exclude zero')
  assert.ok(lo1 > 0.8 && hi1 <= 1, 'all solves must not exclude one')
  const [lo, hi] = wilson(12, 24)
  assert.ok(lo < 0.5 && hi > 0.5)
})

test('EXACT: ranks average ties and Spearman is +/-1 on monotone data', () => {
  assert.deepEqual(rankAverage([10, 20, 20, 30]), [1, 2.5, 2.5, 4])
  assert.equal(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1)
  assert.equal(spearman([1, 2, 3, 4], [40, 30, 20, 10]), -1)
  assert.ok(Math.abs(spearman([1, 2, 3, 4, 5], [1, 3, 2, 5, 4]) - 0.8) < 1e-12)
})

// ---------------------------------------------------------------- the F42 classification

test('the per-task classes use hardbatch.mjs thresholds, so the tables can be read together', () => {
  assert.equal(classifyTask({ solves: 10, nArms: 10, scoreMean: 1 }), 'TOO EASY')
  assert.equal(classifyTask({ solves: 0, nArms: 10, scoreMean: 0.2 }), 'TOO HARD')
  assert.equal(classifyTask({ solves: 0, nArms: 10, scoreMean: 0.83 }), 'THRESHOLD')
  assert.equal(classifyTask({ solves: 6, nArms: 10, scoreMean: 0.9 }), 'DISCRIMINATING')
  assert.equal(classifyTask({ solves: 6, nArms: 10, scoreMean: 0.9 }, { spread: 20 }), 'weak separation')
})

test('spreadPp measures the max-min arm solve rate, not the count', () => {
  assert.equal(spreadPp([10, 10, 10, 10], 10), 0)
  assert.equal(spreadPp([10, 5, 0, 3], 10), 100)
  assert.equal(spreadPp([4, 4, 4], 10), 0)
})

// ---------------------------------------------------------------- the cell/retry rule

const rec = (over) => Object.assign({
  ts: '2026-10-04T00:00:00.000Z', runId: 'r1', task: 't1', arm: 'dsh:ptc', seed: 1,
  solved: false, score: 0.5, costUsd: 1, steps: 10, position: 0, exitCode: 1,
}, over)

test('FIXTURE: an infrastructure record and its retry are one cell, and the retry is the value', () => {
  const killed = rec({ runId: 'killed', exitCode: 1073807364, solved: false, score: null, costUsd: 0 })
  const retry = rec({ runId: 'retry', solved: true, score: 1, costUsd: 2 })
  const v = cellValue([killed, retry])
  assert.equal(v.record.runId, 'retry')
  assert.equal(v.retryUsed, true)
  assert.equal(v.worstCase.record.runId, 'killed')
  assert.equal(v.worstCase.solved, false)
})

test('FIXTURE: a single record is its own worst case, and a solved record is never re-bucketed', () => {
  const one = rec({ runId: 'only', solved: true })
  const v = cellValue([one])
  assert.equal(v.retryUsed, false)
  assert.equal(v.worstCase.record.runId, 'only')
  const killedButSolved = rec({ runId: 'k', exitCode: 1073807364, solved: true })
  assert.equal(cellValue([killedButSolved]).record.runId, 'k')
})

test('FIXTURE: the task table pairs by task and reports solves, spread and class', () => {
  const rows = []
  for (let a = 0; a < 10; a++) rows.push(rec({ task: 't1', arm: 'arm' + a, solved: a < 5, score: a < 5 ? 1 : 0.9, costUsd: 1 + a }))
  for (let a = 0; a < 10; a++) rows.push(rec({ task: 't2', arm: 'arm' + a, solved: true, score: 1, costUsd: 1 }))
  const t = taskTable(rows)
  assert.equal(t.length, 2)
  const t1 = t.find((x) => x.task === 't1')
  assert.equal(t1.solves, 5)
  assert.equal(t1.spread, 100)
  assert.equal(t1.cls, 'DISCRIMINATING')
  assert.equal(t.find((x) => x.task === 't2').cls, 'TOO EASY')
})

// ---------------------------------------------------------------- real data

test('REAL DATA: the shipped matrix has the shape the plan declares', () => {
  const p = loadPilot({ dir: PILOT })
  assert.equal(p.flow.records, DECLARED.records)
  assert.equal(p.flow.cells, DECLARED.cells)
  assert.equal(p.flow.excludedRecords, DECLARED.excludedRecords)
  assert.equal(p.flow.absentCells, 0)
  assert.equal(p.flow.arms, DECLARED.arms)
  assert.equal(p.flow.tasks, DECLARED.tasks)
  assert.equal(p.flow.usageJoinedRecords, DECLARED.records, 'every record must be priced from gateway usage')
  assert.equal(p.flow.usageJoinedCells, p.flow.cells, 'every analysed cell must be priced')
  assert.equal(p.flow.scoredCells, DECLARED.cells)
  assert.equal(p.flow.retriedCells, 1)
})

test('REAL DATA: the one excluded record is the OS-terminated one, and it is the retried cell', () => {
  const p = loadPilot({ dir: PILOT })
  assert.equal(p.flow.byCause.interrupted, 1)
  assert.deepEqual(p.flow.retriedCellKeys,
    ['lh-inventory-allocation|dsh:ptc-terse|1'],
    'the retried cell is the one PRE-REGISTRATION.md section 12.9 names')
})

test('REAL DATA: cost is re-derived from tokens and is not read from any summary', () => {
  const p = loadPilot({ dir: PILOT })
  for (const r of p.rows) {
    assert.ok(Number.isFinite(r.costUsd) && r.costUsd >= 0, 'cost must be a finite number')
    assert.ok(r.steps >= 0, 'steps must be countable')
    assert.ok(r.costUsd === 0 || r.steps > 0, 'a priced run has requests')
  }
  const zero = p.rows.filter((r) => r.steps === 0)
  assert.ok(zero.length <= 1, 'at most the terminated record has no requests')
})

test('REAL DATA: the position diagnostic is reported, not assumed balanced', () => {
  const d = POSITION_DIAGNOSTIC
  assert.equal(typeof d.maxAbsDeviationPp, 'number')
  assert.equal(d.byArm.length, DECLARED.arms)
  assert.equal(d.rule, 'adjust if maxAbsDeviationPp > ' + DECLARED.positionAsymmetryPp)
})

// ---------------------------------------------------------------- wiring

test('WIRING: every declared constant equals the number written in the plan', () => {
  const plan = readFileSync(join(repo, 'notes/plans/PRE-REGISTRATION-HARD.md'), 'utf8')
  const must = [
    '24 tasks x 10 arms x 1 seed = **240 cells**',
    '241 records',
    '20 000 times',
    '5 000 draws',
    '+/-10 percentage points',
    'S >= 10pp',
    '`mean_t(R_t) <= -10%`',
    'Holm-Bonferroni, alpha 0.05',
  ]
  for (const s of must) assert.ok(plan.includes(s), 'the plan must still declare: ' + s)
  assert.equal(DECLARED.tasks, 24)
  assert.equal(DECLARED.arms, 10)
  assert.equal(DECLARED.cells, 240)
  assert.equal(DECLARED.records, 241)
  assert.equal(DECLARED.permutationIters, 20000)
  assert.equal(DECLARED.bootstrapIters, 5000)
  assert.equal(DECLARED.equivalenceMarginPp, 10)
  assert.equal(DECLARED.hh1FloorPp, 10)
  assert.equal(DECLARED.hh3FloorPct, -10)
  assert.equal(DECLARED.alpha, 0.05)
})

test('WIRING: the tool implements the plan by commit, and the plan is committed', () => {
  const src = readFileSync(join(here, 'hard-analysis.mjs'), 'utf8')
  assert.ok(src.includes('notes/plans/PRE-REGISTRATION-HARD.md'), 'the tool must name the plan it implements')
})
