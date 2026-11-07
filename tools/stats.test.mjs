/**
 * stats.test.mjs - PROPERTY tests for the study's resampling statistics.
 *
 * These do NOT assert today's output. They assert the properties a verdict depends on,
 * because the defects they exist for were invisible to output tests: a shared RNG stream
 * behind a comment claiming it was fixed (hypotheses.mjs:40-42), and a Holm implementation
 * that never steps down (panel-analysis.mjs:280-286).
 *
 * Run: node --test tools/stats.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { clusterBootstrap, bootstrapTaskMean, signFlipP, holmFamily, mean } from './stats.mjs'

const mkDiffs = (xs) => new Map(xs.map((v, i) => ['task-' + i, v]))
const A = mkDiffs([1.0, 1.1, 0.9, 1.2, 1.05, 0.95, 1.15, 1.02])
const B = mkDiffs([-2.0, -1.9, -2.1, -2.05, -1.95, -2.02, -1.98, -2.1])

test('clusterBootstrap: a call is independent of what was drawn before it', () => {
  const first = bootstrapTaskMean(A)
  bootstrapTaskMean(B)   // an unrelated call must not move the stream
  const again = bootstrapTaskMean(A)
  assert.deepEqual(again, first, 'the same input gave a different interval after another call - the stream is shared')
})

test('clusterBootstrap: deterministic for a given input and seed', () => {
  assert.deepEqual(bootstrapTaskMean(A), bootstrapTaskMean(A))
  assert.deepEqual(bootstrapTaskMean(A, { seed: 7 }), bootstrapTaskMean(A, { seed: 7 }))
})

test('clusterBootstrap: the rows/statistic entry point is also fresh per call', () => {
  const rows = (xs) => xs.flatMap((v, i) => [{ task: 't' + i, v }, { task: 't' + i, v: v * 1.01 }])
  const stat = (draw) => mean(draw.map((r) => r.v))
  const first = clusterBootstrap(rows([1, 2, 1.5, 0.5, 1.1, 0.9]), stat)
  clusterBootstrap(rows([-1, -2, -1.5, -0.5]), stat)
  assert.deepEqual(clusterBootstrap(rows([1, 2, 1.5, 0.5, 1.1, 0.9]), stat), first)
})

test('signFlipP: a contrast is independent of how many contrasts were tested before it', () => {
  const p1 = signFlipP([...A.values()])
  signFlipP([...B.values()])
  const p2 = signFlipP([...A.values()])
  assert.equal(p2.p, p1.p, 'the same contrast got a different p after another contrast was tested - order-dependent table')
  assert.equal(p2.se, p1.se)
})

test('signFlipP: reports a Monte Carlo standard error and the draw count', () => {
  const r = signFlipP([...A.values()])
  assert.equal(r.iters, 200000, 'the shipped draw count must resolve a p near 0.01')
  assert.ok(Math.abs(r.se - Math.sqrt((r.p * (1 - r.p)) / r.iters)) < 1e-12)
})

test('holmFamily: family size is the number of tests reported together', () => {
  const fam = holmFamily([{ id: 'a', p: 0.001 }, { id: 'b', p: 0.02 }, { id: 'c', p: 0.04 }])
  assert.equal(fam.m, 3)
  assert.equal(fam.rows[0].threshold, 0.05 / 3)
})

test('holmFamily: STEP-DOWN - once a test fails, every later test fails too', () => {
  // 0.049 clears alpha/1 = 0.05 on its own, but the two smaller p-values before it do not
  // clear their thresholds, and Holm stops at the first failure.
  const fam = holmFamily([{ id: 'a', p: 0.03 }, { id: 'b', p: 0.04 }, { id: 'c', p: 0.049 }])
  const verdicts = fam.rows.map((r) => r.passes)
  const detail = JSON.stringify(fam.rows.map((r) => [r.id, r.p, r.threshold, r.passes]))
  assert.deepEqual(verdicts, [false, false, false], 'Holm did not step down: ' + detail)
})

test('holmFamily: verdicts are monotone in p and independent of input order', () => {
  const tests = [{ id: 'a', p: 0.0001 }, { id: 'b', p: 0.02 }, { id: 'c', p: 0.049 }, { id: 'd', p: 0.9 }]
  const one = holmFamily(tests)
  const two = holmFamily([...tests].reverse())
  const byId = (f) => Object.fromEntries(f.rows.map((r) => [r.id, r.passes]))
  assert.deepEqual(byId(two), byId(one))
  const flags = one.rows.map((r) => r.passes)
  assert.deepEqual(flags, [...flags].sort((x, y) => Number(y) - Number(x)), 'passes must be a prefix of the sorted family')
})

test('holmFamily: a McNemar test reported beside the cost contrasts is corrected with them', () => {
  // The filed rule (PRE-REGISTRATION.md section 6): "All secondary and pairwise contrasts
  // receive Holm-Bonferroni correction across the family reported together." The SAME p-value
  // therefore has different verdicts in a narrow family and in the filed one - which is the
  // whole defect: the tool corrected 7 contrasts while the McNemar tests sat outside, uncorrected.
  const mcnemar = { id: 'solve-rate-x', p: 0.0072 }
  assert.equal(holmFamily([mcnemar]).rows[0].passes, true, 'p=0.0072 clears uncorrected alpha')

  const cost = [0.0057, 0.0331, 0.2, 0.4, 0.6, 0.8133, 0.9788].map((p, i) => ({ id: 'cost-' + i, p }))
  const narrow = holmFamily([...cost, mcnemar])
  assert.equal(narrow.m, 8)

  const solve = [mcnemar, ...[0.11, 0.24, 0.35, 0.52, 0.68, 0.79, 1.0].map((p, i) => ({ id: 'solve-' + i, p }))]
  const filed = holmFamily([...cost, ...solve])
  assert.equal(filed.m, 15, 'the family reported together is every secondary/pairwise contrast with a p-value')
  assert.equal(filed.rows.find((r) => r.id === 'solve-rate-x').passes, false,
    'inside the filed family alpha/m = ' + (0.05 / 15).toFixed(5) + ' and p=0.0072 does not clear it')
  assert.equal(filed.rows.filter((r) => r.passes).length, 0,
    'under the filed family nothing in this family survives: the smallest p is 0.0057 against alpha/15')
})

test('mean is the arithmetic mean', () => {
  assert.equal(mean([1, 2, 3]), 2)
  assert.ok(Number.isNaN(mean([])))
})

// Comments describe the bugs; only CODE can still have them. Both structural tests below read
// non-comment lines only, for the same reason the repo has a test that reads code at all.
const codeLines = (text) => text.split(String.fromCharCode(10)).filter((l) => {
  const t = l.trim()
  return !(t.startsWith('*') || t.startsWith('//') || t.startsWith('/*'))
})

test('STRUCTURAL: no tool evaluates the broken LCG in doubles', () => {
  const dir = new URL('./', import.meta.url)
  const offenders = []
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.mjs') && !n.endsWith('.test.mjs'))) {
    for (const line of codeLines(readFileSync(new URL(f, dir), 'utf8'))) {
      if (line.includes('1103515245')) offenders.push(f + ': ' + line.trim().slice(0, 60))
    }
  }
  assert.deepEqual(offenders, [], 'the precision-losing LCG is still live: ' + offenders.join(' | '))
})

test('STRUCTURAL: the analysis tools share one bootstrap, one Holm and one generator', () => {
  const dir = new URL('./', import.meta.url)
  const read = (f) => readFileSync(new URL(f, dir), 'utf8')
  for (const name of ['panel-analysis.mjs', 'hypotheses.mjs', 'hard-analysis.mjs']) {
    const text = read(name)
    assert.ok(text.includes("from './stats.mjs'"), name + ' must import the shared statistics')
    assert.ok(!/function clusterBootstrap/.test(text), name + ' still defines its own cluster bootstrap')
    assert.ok(!/function holm/.test(text), name + ' still defines its own Holm')
    const draws = codeLines(text).filter((l) => l.includes('makeRng('))
    assert.deepEqual(draws, [], name + ' draws its own randomness instead of using tools/stats.mjs: ' + draws.join(' | '))
  }
})

test('PROPERTY: clusterBootstrap honours probs, and its default call is unchanged', () => {
  // The hard-suite equivalence test needs a 90% interval. Before this option existed the call
  // would have been silently given the 95% interval, and a TOST verdict from the wrong interval
  // is a wrong verdict - so the option is tested, not assumed.
  const rows = Array.from({ length: 60 }, (_, i) => ({ task: 't' + i, v: i }))
  const stat = (draw) => mean(draw.map((x) => x.v))
  const d95 = clusterBootstrap(rows, stat, { iters: 2000, seed: 7 })
  const d90 = clusterBootstrap(rows, stat, { iters: 2000, seed: 7, probs: [0.05, 0.95] })
  assert.deepEqual(clusterBootstrap(rows, stat, { iters: 2000, seed: 7, probs: [0.025, 0.975] }), d95,
    'the default IS the 95% interval')
  assert.equal('probs' in d95, false, 'the return shape must not grow: recorded outputs are regenerated')
  assert.ok(d90.lo >= d95.lo && d90.hi <= d95.hi, 'the 90% interval lies inside the 95% one')
  assert.ok(d90.hi - d90.lo < d95.hi - d95.lo, 'and is strictly narrower on spread data')
  assert.deepEqual(clusterBootstrap(rows, stat, { iters: 2000, seed: 7 }), d95,
    'a default call is deterministic and unchanged by the new option')
  const withDraws = clusterBootstrap(rows, stat, { iters: 500, seed: 7, returnDraws: true })
  assert.equal(withDraws.draws.length, withDraws.n, 'draws are returned when asked for, and only then')
  assert.deepEqual(withDraws.draws, [...withDraws.draws].sort((a, b) => a - b), 'draws come back sorted')
  assert.equal(clusterBootstrap(rows, stat, { iters: 500, seed: 7 }).draws, undefined, 'and never otherwise')
})
