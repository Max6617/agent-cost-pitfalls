/**
 * rerun-compare.test.mjs - the re-run's pre-registered questions (notes/plans/RERUN-PLAN.md section 4), on
 * constructed panels whose answers are known.
 *
 * Run: node --test tools/rerun-compare.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classify, contrast, orderEffect, q2Verdict, aaSummary, drift } from './rerun-compare.mjs'
import { registerRerun, RERUN_DATASETS } from './rerun-datasets.mjs'
import { DATASETS, SUITES, DEFAULT_DATASETS } from './cost-panel.mjs'

const ITERS = { iters: 4000 }
// A two-arm block: native costs `n`, ptc costs `p`, `lead` names the arm at position 0.
function block (task, seed, n, p, lead, extra = {}) {
  return [
    { task, seed, arm: 'dsh:native', costBilled: n, position: lead === 'native' ? 0 : 1, solved: true, requests: 10, hit: 90, fresh: 10, created: 0, ...extra },
    { task, seed, arm: 'dsh:ptc', costBilled: p, position: lead === 'ptc' ? 0 : 1, solved: true, requests: 8, hit: 90, fresh: 10, created: 0, ...extra },
  ]
}

test('classify: positive / negative / null by whether the interval excludes zero', () => {
  assert.equal(classify(1, 3), 'positive')
  assert.equal(classify(-3, -1), 'negative')
  assert.equal(classify(-1, 3), 'null')
})

test('contrast: the A2 convention - mean per-task difference as a percent of the native mean', () => {
  const rows = []
  for (let t = 0; t < 20; t++) for (const s of [1, 2]) rows.push(...block('t' + t, s, 10, 12, s === 1 ? 'native' : 'ptc'))
  const c = contrast(rows, ITERS)
  assert.equal(c.tasks, 20)
  assert.ok(Math.abs(c.pct - 20) < 1e-9, 'ptc 12 against native 10 is +20%, got ' + c.pct)
  assert.equal(c.cls, 'positive')
})

test('Q3 order effect: the contrast in ptc-led blocks minus native-led blocks, as a percent of native', () => {
  const rows = []
  // ptc led on seed 1 of every task and cost +2 more there; native led on seed 2 and they tied
  for (let t = 0; t < 30; t++) {
    rows.push(...block('t' + t, 1, 10, 12, 'ptc'))
    rows.push(...block('t' + t, 2, 10, 10, 'native'))
  }
  const o = orderEffect(rows, ITERS)
  assert.ok(Math.abs(o.pct - 20) < 1e-9, 'expected +20%, got ' + o.pct)
  assert.equal(o.blocksPtcFirst, 30)
  assert.equal(o.blocksNativeFirst, 30)
  assert.ok(o.ciLoPct > 0, 'a constant effect has a degenerate interval above zero')
})

test('Q2: the re-run sits closer to the adjusted estimate than to the raw one in >= 5 of 8 rows -> holds', () => {
  const row = (rerun, raw, adj) => ({ rerun, raw, adjustedLog: adj })
  const closer = Array.from({ length: 5 }, () => row(10, 30, 12))
  const farther = Array.from({ length: 3 }, () => row(28, 30, 12))
  assert.equal(q2Verdict([...closer, ...farther]).verdict, 'holds')
  assert.equal(q2Verdict([...closer.slice(0, 3), ...farther, row(28, 30, 12), row(28, 30, 12)]).verdict, 'fails')
  assert.equal(q2Verdict([...closer.slice(0, 4), ...farther, row(28, 30, 12)]).verdict, 'inconclusive')
  assert.throws(() => q2Verdict([row(1, 2, 3)]), /8 rows/)
})

test('Q5 A/A: identical copies -> zero label difference; a cheaper second copy shows up as carry-over', () => {
  const rows = []
  for (let t = 0; t < 30; t++) {
    for (const s of [1, 2]) {
      const twinLeads = s === 1
      // whichever copy runs second costs 1 less: pure carry-over, no difference between the copies
      rows.push({ task: 't' + t, seed: s, arm: 'dsh:native', costBilled: twinLeads ? 9 : 10, position: twinLeads ? 1 : 0, hit: 90, fresh: 10, created: 0 })
      rows.push({ task: 't' + t, seed: s, arm: 'dsh:native-twin', costBilled: twinLeads ? 10 : 9, position: twinLeads ? 0 : 1, hit: 90, fresh: 10, created: 0 })
    }
  }
  const a = aaSummary(rows, ITERS)
  assert.ok(Math.abs(a.label.pct) < 1e-9, 'the copies are identical on average: ' + a.label.pct)
  assert.ok(Math.abs(a.carryOver.pct - (-1 / 9.5 * 100)) < 1e-9, 'second minus first is -1 on a mean of 9.5: ' + a.carryOver.pct)
  assert.equal(a.prediction.labelWithin2pct, true)
})

test('drift: the re-run native arm against the filed native mean', () => {
  const rows = block('t', 1, 11, 12, 'native')
  const d = drift(rows, 10)
  assert.ok(Math.abs(d.pct - 10) < 1e-9)
})

test('the re-run datasets register under their own suites and never enter the default population', () => {
  const before = DEFAULT_DATASETS.slice()
  const added = registerRerun()
  registerRerun()   // idempotent
  assert.deepEqual(DEFAULT_DATASETS, before)
  assert.equal(added['rerun-b1'].length, 5, 'four cheap providers plus Haiku (block C)')
  assert.equal(added['rerun-b'].length, 4)
  assert.equal(added['rerun-aa'].length, 1)
  assert.equal(DATASETS.filter((d) => d.id === 'rerun-b-deepseek').length, 1)
  for (const d of RERUN_DATASETS) assert.match(d.runs, /^results\/rerun-(b1|b|aa)-(ds-full|glm-flash|qwen-full|luna-full|haiku-full)\/runs\.jsonl$/)
  assert.ok(!SUITES.batch1.some((id) => id.startsWith('rerun')))
})

test('on the filed batch-1 panel, contrast() reproduces the filed raw estimates exactly', async () => {
  const { readFileSync } = await import('node:fs')
  const panel = JSON.parse(readFileSync('analysis/cost-panel-6model-2026-10-03.json', 'utf8')).panel
  const filed = JSON.parse(readFileSync('analysis/position-adjust-6model-2026-10-09.json', 'utf8')).models
  for (const model of ['deepseek-flash', 'claude-haiku-4.5']) {
    const c = contrast(panel.filter((r) => r.model === model), { iters: 200000, seed: 12345 })
    const f = filed.find((m) => m.model === model).raw
    assert.ok(Math.abs(c.pct - f.pct) < 1e-9, model + ' point: ' + c.pct + ' vs ' + f.pct)
    assert.ok(Math.abs(c.ciLoPct - f.ciLoPct) < 1e-9, model + ' lower: ' + c.ciLoPct + ' vs ' + f.ciLoPct)
    assert.ok(Math.abs(c.ciHiPct - f.ciHiPct) < 1e-9, model + ' upper: ' + c.ciHiPct + ' vs ' + f.ciHiPct)
  }
})
