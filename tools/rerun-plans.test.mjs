/**
 * rerun-plans.test.mjs - the re-run's plans run what notes/plans/RERUN-PLAN.md says, and cost what it budgets.
 *
 * Run: node --test tools/rerun-plans.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RERUN_PLANS, RERUN_ARMS, rerunCells, rerunCostPerCell, rerunRunnerFlags } from './rerun-plans.mjs'

test('the contrast plans run exactly the central pair, counterbalanced, DSH only', () => {
  assert.deepEqual(RERUN_ARMS, ['dsh:native', 'dsh:ptc'])
  for (const id of ['rerun-b1', 'rerun-b', 'rerun-smoke']) {
    const p = RERUN_PLANS[id]
    assert.deepEqual(p.armsList, RERUN_ARMS, id)
    assert.equal(p.counterbalance, true, id)
    assert.deepEqual(p.harnesses, ['dsh'], id + ' must not preflight the external harnesses')
    assert.deepEqual(rerunRunnerFlags(p), ['--counterbalance'], id)
  }
})

test('cell counts match the plan document (496 + 640 contrast cells over four providers, 124 A/A)', () => {
  assert.equal(rerunCells(RERUN_PLANS['rerun-b1']), 124)
  assert.equal(rerunCells(RERUN_PLANS['rerun-b']), 160)
  assert.equal(rerunCells(RERUN_PLANS['rerun-b1']) * 4, 496)
  assert.equal(rerunCells(RERUN_PLANS['rerun-b']) * 4, 640)
  assert.equal(rerunCells(RERUN_PLANS['rerun-aa']), 124)
  assert.equal(rerunCells(RERUN_PLANS['rerun-smoke']), 4)
  assert.equal(rerunCells(RERUN_PLANS['rerun-aa-smoke']), 4)
  const doc = readFileSync('notes/plans/RERUN-PLAN.md', 'utf8')
  for (const n of ['496', '640', '124']) assert.ok(doc.includes('| ' + n + ' |'), 'notes/plans/RERUN-PLAN.md budget table states ' + n + ' cells')
})

test('the A/A plan is one arm twinned, interleaved, under the byte-identity workdir rule', () => {
  const p = RERUN_PLANS['rerun-aa']
  assert.deepEqual(p.armsList, ['dsh:native'])
  assert.equal(p.twin, true)
  assert.equal(p.aaWorkdir, true, 'without the AA workdir the two copies would see different paths')
  assert.deepEqual(rerunRunnerFlags(p), ['--counterbalance', '--aa-twin'])
})

test('the smokes are one task, both seeds, so each lead assignment occurs once', () => {
  for (const id of ['rerun-smoke', 'rerun-aa-smoke']) {
    assert.equal(RERUN_PLANS[id].tasks, 1)
    assert.equal(RERUN_PLANS[id].seeds, 2)
    assert.equal(RERUN_PLANS[id].only, 'example-fix')
  }
})

test('block C is estimated at its filed DSH cost, inside its filed $31 ceiling; others keep the generic', () => {
  const b1 = RERUN_PLANS['rerun-b1']
  const est = rerunCells(b1) * rerunCostPerCell(b1, 'anthropic', 0.362)
  assert.ok(Math.abs(est - 18.84) < 0.01, 'filed $18.84, got ' + est)
  assert.ok(est * 1.5 <= 31)
  assert.equal(rerunCostPerCell(b1, 'deepseek', 0.0087), 0.0087)
  assert.equal(rerunCostPerCell(RERUN_PLANS['rerun-b'], 'anthropic', 0.362), 0.362)
})
