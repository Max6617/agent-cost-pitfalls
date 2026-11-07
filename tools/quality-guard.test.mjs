/**
 * quality-guard.test.mjs - the guard counts what it says it counts.
 *
 * Run: node --test tools/quality-guard.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { guardModel } from './quality-guard.mjs'

const row = (task, seed, arm, solved, costBilled, requests = 10) => ({ task, seed, arm, solved, costBilled, requests })

test('discordant pairs, per-solved cost and the both-solved restriction', () => {
  const rows = [
    // t1: both solve both seeds, ptc dearer by 1 each time
    row('t1', 1, 'dsh:native', true, 2), row('t1', 1, 'dsh:ptc', true, 3),
    row('t1', 2, 'dsh:native', true, 2), row('t1', 2, 'dsh:ptc', true, 3),
    // t2: native solves, ptc fails twice - excluded from the both-solved contrast
    row('t2', 1, 'dsh:native', true, 2), row('t2', 1, 'dsh:ptc', false, 9),
    row('t2', 2, 'dsh:native', true, 2), row('t2', 2, 'dsh:ptc', false, 9),
    // an arm outside the contrast is ignored
    row('t1', 1, 'goose', false, 100),
  ]
  const g = guardModel(rows, { iters: 2000 })
  assert.equal(g.native.solved, 4)
  assert.equal(g.ptc.solved, 2)
  assert.equal(g.mcnemar.n01, 2)
  assert.equal(g.mcnemar.n10, 0)
  assert.equal(g.native.costPerSolved, 2)
  assert.equal(g.ptc.costPerSolved, (3 + 3 + 9 + 9) / 2)
  assert.equal(g.bothSolved.cells, 2)
  assert.equal(g.bothSolved.tasks, 1)
  assert.equal(g.bothSolved.pct, 50)   // +1 on a native mean of 2
})

test('where both arms solve every cell, the guard reproduces the filed A2 contrast exactly', () => {
  const guard = JSON.parse(readFileSync('analysis/quality-guard-2026-10-10.json', 'utf8'))
  const a2 = JSON.parse(readFileSync('analysis/panel-analysis-6model-2026-10-09.json', 'utf8')).sections.A2
  for (const model of ['deepseek-flash', 'claude-sonnet-5.5']) {
    const g = guard.suites.batch1.find((r) => r.model === model)
    const f = a2.find((r) => r.model === model)
    assert.equal(g.native.solved, g.native.cells, model + ' native solves every cell')
    assert.equal(g.ptc.solved, g.ptc.cells, model + ' ptc solves every cell')
    assert.ok(Math.abs(g.bothSolved.pct - f.relDiffPct) < 1e-9, model + ' point estimate')
    assert.ok(Math.abs(g.bothSolved.ciLoPct - f.ciLoPct) < 1e-9, model + ' lower bound')
    assert.ok(Math.abs(g.bothSolved.ciHiPct - f.ciHiPct) < 1e-9, model + ' upper bound')
  }
})
