/**
 * ablations.test.mjs - the ablation helpers must slice without re-deriving, and must not read an
 * empty subset as a result.
 *
 * WHY THIS EXISTS. Every ablation in tools/ablations.mjs is a RESTRICTION of something already
 * computed: a subset of models, of arms, of seeds, or of datasets. The failure mode of a restriction
 * is silent - an empty subset that returns 0 where it should return "nothing measured", or a filter
 * that removes the wrong rows and makes a claim look robust when it is not.
 *
 * Run: node --test tools/ablations.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { median, excludeModel, tieFraction, differential, classify, rankingAblations, modelDrops, h3LeaveOneOut } from './ablations.mjs'
import { DEFAULT_DATASETS, DATASETS } from './cost-panel.mjs'

test('median handles odd, even and empty without returning NaN', () => {
  assert.equal(median([3, 1, 2]), 2)
  assert.equal(median([4, 1, 3, 2]), 2.5)
  assert.equal(median([]), null, 'an empty list is null, never NaN or 0')
  assert.equal(median([2]), 2)
})

test('excludeModel drops exactly the pairs that involve that model, and does not mutate', () => {
  const c = [
    { a: 'm1', b: 'm2', rho: 0.5 },
    { a: 'm1', b: 'm3', rho: -0.5 },
    { a: 'm2', b: 'm3', rho: 0.25 },
  ]
  const keep = excludeModel(c, 'm1')
  assert.equal(keep.length, 1)
  assert.deepEqual(keep[0], { a: 'm2', b: 'm3', rho: 0.25 })
  assert.equal(c.length, 3, 'the input must not be mutated')
})

test('tieFraction counts distinct===false, honours both filters, and reports an empty subset as null', () => {
  const details = [
    { model: 'm1', higher: 'dsh:ptc', lower: 'dsh:native', distinct: false },
    { model: 'm1', higher: 'goose', lower: 'dsh:ptc', distinct: true },
    { model: 'm2', higher: 'dsh:ptc-opt', lower: 'dsh:native-opt', distinct: false },
    { model: 'm2', higher: 'cline', lower: 'goose', distinct: true },
    { model: 'm2', higher: 'unknown', lower: 'unknown2' },   // no verdict: counted neither way
  ]
  assert.deepEqual(tieFraction(details), { pairs: 4, ties: 2, fraction: 0.5 })
  assert.deepEqual(tieFraction(details, { models: ['m1'] }), { pairs: 2, ties: 1, fraction: 0.5 })
  const dsh = tieFraction(details, { arms: ['dsh:ptc', 'dsh:native', 'dsh:ptc-opt', 'dsh:native-opt'] })
  assert.deepEqual(dsh, { pairs: 2, ties: 2, fraction: 1 })
  assert.equal(tieFraction([]).fraction, null, 'nothing measured is null, not 0')
  assert.equal(tieFraction(details, { models: ['nobody'] }).fraction, null)
})

test('differential recovers a known paired effect and refuses an unpaired one', () => {
  const rows = []
  for (let i = 0; i < 20; i++) {
    for (const seed of [1, 2]) {
      const base = 0.01 * (1 + (i % 4) * 0.1)
      for (const [arm, mult] of [['dsh:native', 1], ['dsh:ptc', 0.9]]) {
        rows.push({ model: 'm1', arm, task: 't' + i, seed, costBilled: base * mult, costCold: base * mult,
          requests: 5, out: 100, solved: true, passRate: 1, hitRate: 0.5, primary: true })
      }
    }
  }
  const d = differential(rows, 'm1', 'dsh:native', 'dsh:ptc')
  assert.equal(d.tasks, 20)
  assert.ok(Math.abs(d.pct - (-10)) < 3, 'must recover about -10%, got ' + d.pct.toFixed(2) + '%')
  assert.equal(differential(rows, 'm1', 'dsh:native', 'dsh:ptc-opt'), null, 'no such arms: null, not NaN')
  assert.equal(differential(rows, 'nobody', 'dsh:native', 'dsh:ptc'), null)
})

test('classify is the paper\'s rule, strict at zero', () => {
  assert.equal(classify({ lo: 0.1, hi: 5 }), 'positive')
  assert.equal(classify({ lo: -5, hi: -0.1 }), 'negative')
  assert.equal(classify({ lo: -1, hi: 1 }), 'null')
  assert.equal(classify({ lo: 0, hi: 1 }), 'null')
  assert.equal(classify(null), 'n/a')
})

test('a MODEL drop is a group of datasets, and covers every dataset exactly once', () => {
  const drops = modelDrops(DEFAULT_DATASETS)
  const covered = drops.flatMap((d) => d.ids)
  assert.equal(covered.length, DEFAULT_DATASETS.length)
  assert.deepEqual([...covered].sort(), [...DEFAULT_DATASETS].sort())
  // GLM is four matrices under two model labels, so a single-id drop would leave most of it in sample.
  const glm = drops.filter((d) => d.ids.some((x) => x.startsWith('glm')))
  assert.equal(glm.flatMap((d) => d.ids).length, 4, 'all four glm matrices must be covered')
  assert.ok(drops.every((d) => d.ids.length >= 1))
})

test('a drop naming a dataset that is not in the selection is REFUSED, not silently a no-op', () => {
  // Otherwise "leave luna out" on the four-provider tasks-b selection would return the full-sample fit
  // and be reported as a leave-one-out.
  // 'batchb-qwen' is a tasks-b dataset and is NOT in the batch-1 default selection: naming it as a
  // drop must refuse BEFORE spawning anything, or the "leave-one-out" would be the full-sample fit.
  assert.throws(() => h3LeaveOneOut(DEFAULT_DATASETS, [{ label: 'nope', ids: ['batchb-qwen'] }]),
    /names datasets not in the selection/)
  assert.throws(() => h3LeaveOneOut(DEFAULT_DATASETS, [{ label: 'empty', ids: [] }]), /has no dataset ids/)
})

test('REAL DATA: the two suites disagree about the tie fraction, and that is now pinned', () => {
  const b1 = JSON.parse(readFileSync('analysis/panel-analysis-6model-2026-10-03.json', 'utf8'))
  const tb = JSON.parse(readFileSync('analysis/panel-analysis-batchb-2026-10-09.json', 'utf8'))
  const R1 = rankingAblations(b1, 'batch-1'), RT = rankingAblations(tb, 'tasks-b')
  // PAPER section 3.4 quotes 40 of 54 for batch-1. The tasks-b suite gives fewer ties, and the paper
  // did not report that; it is now a recorded difference rather than an unnoticed one.
  assert.deepEqual([R1.overall.ties.ties, R1.overall.ties.pairs], [40, 54])
  assert.deepEqual([RT.overall.ties.ties, RT.overall.ties.pairs], [33, 54])
  assert.ok(R1.overall.medianRho > 0 && R1.overall.medianRho < 1)
  for (const R of [R1, RT]) {
    assert.equal(R.excludingEachModel.length, 6)
    // Six models give C(6,2) = 15 model pairs; dropping one leaves C(5,2) = 10.
    assert.equal(R.overall.pairs, 15)
    for (const e of R.excludingEachModel) assert.equal(e.pairs, 10, 'dropping one of six models leaves ten pairs')
  }
})