/**
 * cell-counts.test.mjs - the sign-off must not print "241/240 cells" or a negative cell count.
 *
 *   node --test tools/cell-counts.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { countCells, describeCells, unresolvedFailures } from './cell-counts.mjs'

const rec = (task, arm, seed, solved) => ({ task, arm, seed, solved })

test('THE DEFECT: a retried cell is one cell and two records, never a negative absence', () => {
  const runs = []
  for (let i = 0; i < 239; i++) runs.push(rec('t' + i, 'dsh:native', 1, i % 2 === 0))
  // the killed cell and its retry, exactly as the hard pilot holds it
  runs.push(rec('lh-inventory-allocation', 'dsh:ptc-terse', 1, false))
  runs.push(rec('lh-inventory-allocation', 'dsh:ptc-terse', 1, true))
  const c = countCells(runs, { planned: 240 })
  assert.equal(c.records, 241)
  assert.equal(c.cells, 240)
  assert.equal(c.retried, 1)
  assert.equal(c.absent, 0, 'nothing is absent when every cell has a record')
  assert.equal(c.surplus, 0)
  assert.equal(c.planned === undefined, true)
  // the old arithmetic, pinned: records-minus-planned is the negative everyone would stop at
  assert.equal(240 - c.records, -1)
  assert.deepEqual(c.retriedCells, ['lh-inventory-allocation|dsh:ptc-terse|1'])
  const line = describeCells(c, 240)
  assert.match(line, /240\/240 cells \(241 records, 1 retried\)/)
  assert.match(line, /121 cells solved \(50\.4%\)/)   // 120 of the 239 + the retried cell
})

test('a KILLED cell that was re-run and passed counts as solved, exactly once', () => {
  const runs = [rec('a', 'x', 1, false), rec('a', 'x', 1, true), rec('b', 'x', 1, false)]
  const c = countCells(runs, { planned: 2 })
  assert.equal(c.cells, 2)
  assert.equal(c.solvedCells, 1, 'cell a is solved; cell b is not')
  assert.equal(c.solvedRecords, 1)
  assert.equal(c.absent, 0)
})

test('a missing cell is still reported as absent, and surplus is named separately', () => {
  const c = countCells([rec('a', 'x', 1, true)], { planned: 3 })
  assert.equal(c.absent, 2)
  assert.equal(c.surplus, 0)
  const s = countCells([rec('a', 'x', 1, true), rec('b', 'x', 1, true)], { planned: 1 })
  assert.equal(s.absent, 0, 'absence is never negative')
  assert.equal(s.surplus, 1)
})

test('two unsolved records for one cell do not become two failures', () => {
  const c = countCells([rec('a', 'x', 1, false), rec('a', 'x', 1, false)], { planned: 1 })
  assert.equal(c.cells, 1)
  assert.equal(c.solvedCells, 0)
  assert.equal(c.retried, 1)
})

test('REAL DATA: the hard pilot is 240 cells in 241 records, 178 solved, 1 retry', () => {
  const p = join(dirname(fileURLToPath(import.meta.url)), '..', 'results', 'hardpilot-ds-full', 'runs.jsonl')
  if (!existsSync(p)) return
  const runs = readFileSync(p, 'utf8').split(String.fromCharCode(10)).filter(Boolean).map((l) => JSON.parse(l))
  const c = countCells(runs, { planned: 240 })
  assert.equal(c.cells, 240, 'the design is complete')
  assert.equal(c.records, 241)
  assert.equal(c.retried, 1)
  assert.equal(c.absent, 0)
  assert.equal(c.solvedCells, 178)
  assert.equal(describeCells(c, 240), '240/240 cells (241 records, 1 retried), 178 cells solved (74.2%)')
})

test('a failure record is RESOLVED when the same cell has a record without one', () => {
  // DeepSeek, 2026-10-07: 8 cells were launch failures, --resume retried them, all 8 solved - and the
  // verify stage still refused the sign-off, because its FAILURE RECORDS check counted the historical
  // error records. Records are not cells; that is this module's whole point.
  const runs = [
    { task: 't1', arm: 'dsh:ptc', seed: 1, error: 'unsubstituted placeholder in harness args', solved: false },
    { task: 't1', arm: 'dsh:ptc', seed: 1, solved: true },
    { task: 't2', arm: 'dsh:ptc', seed: 1, error: 'unsubstituted placeholder in harness args', solved: false },
    { task: 't3', arm: 'dsh:ptc', seed: 1, solved: false },
  ]
  const un = unresolvedFailures(runs)
  assert.equal(un.length, 1, 'only the cell with no clean record is unresolved')
  assert.equal(un[0].task, 't2')
})

test('REAL DATA: every failure record in the DeepSeek matrix is resolved by its re-run', () => {
  const p = join(dirname(fileURLToPath(import.meta.url)), '..', 'results', 'batchb-ds-full', 'runs.jsonl')
  if (!existsSync(p)) return
  const runs = readFileSync(p, 'utf8').split(String.fromCharCode(10)).filter(Boolean).map((l) => JSON.parse(l))
  assert.ok(runs.filter((r) => r.error).length >= 8, 'the 8 launch failures are the historical record')
  assert.equal(unresolvedFailures(runs).length, 0,
    'every failed cell was re-run successfully, so nothing should block that sign-off')
})

test('a rule 9 STATUS exclusion is not an unresolved failure', () => {
  // batchb-haiku: the Anthropic monthly account limit refused every request of 447 runs and none
  // of them carries an error field - but a run that does carry one must not be reported as a
  // failure to fix when the gateway says every request it made failed. The verdict comes from
  // tools/exclusions.mjs (exclusionVerdict), never from this module.
  const r = { task: 't1', arm: 'dsh:ptc', seed: 1, runId: 'r1', error: 'the provider refused every call', solved: false }
  assert.equal(unresolvedFailures([r]).length, 1, 'without the verdict it is counted')
  assert.equal(unresolvedFailures([r], { statusExcluded: new Set([r]) }).length, 0)
})

test('a status-excluded record does not RESOLVE another record of the same cell', () => {
  // A record that measured nothing is not evidence the cell succeeded. Keeping it "clean" would
  // let a cell with no usable observation pass as resolved.
  const failed = { task: 't2', arm: 'dsh:ptc', seed: 1, runId: 'r2', error: 'launch failed', solved: false }
  const dead = { task: 't2', arm: 'dsh:ptc', seed: 1, runId: 'r3', solved: false }
  assert.equal(unresolvedFailures([failed, dead]).length, 0, 'the clean record used to resolve it')
  assert.equal(unresolvedFailures([failed, dead], { statusExcluded: new Set([dead]) }).length, 1,
    'a run that measured nothing cannot resolve a failure')
})

test('WIRING: the verify stage uses the cell-aware check, not a raw error count', () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'collect.mjs'), 'utf8')
  assert.match(src, /unresolvedFailures/, 'collect.mjs must ask which failures are still unresolved')
})

test('WIRING: the Anthropic spend guard covers anthropic-sonnet too', () => {
  // The guard tested `wanted.includes('anthropic')`, so `--providers anthropic-sonnet` walked past
  // the one check that stands between this pipeline and the most expensive provider in the study.
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'collect.mjs'), 'utf8')
  assert.ok(!src.includes("wanted.includes('anthropic')"),
    'the guard must not match one provider id; it must match the provider')
  assert.match(src, /wanted\.some\(\(p\) => p\.startsWith\('anthropic'\)\)/,
    'the guard must cover every anthropic* provider')
})

test('WIRING: the verify stage cannot use a binding it does not have', () => {
  // 71c4a0c (the commit that fixed "241/240 cells") deleted `const solved = ...` from the verify
  // stage and left `solved` in the writeStatus call on the next line. Every matrix sign-off since
  // has thrown ReferenceError at its last statement - the smoke matrix of 2026-10-05 was the first
  // run to find out. Same shape as the gateway-polarity defect: a fix that broke the thing next to it.
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'collect.mjs'), 'utf8')
  const lines = src.split('\n')
  const i = lines.findIndex((l) => l.includes("stage('verify'"))
  assert.ok(i >= 0, 'the verify stage must be findable')
  let j = i
  while (j < lines.length && !(j > i && lines[j].trim() === '})')) j++
  const stage = lines.slice(i, j + 1).join('\n')
  assert.ok(stage.length > 100, 'the verify stage must be extracted')
  const usesBareSolved = /[{,]\s*solved\s*[,}]/.test(stage)
  assert.ok(!usesBareSolved || /const solved\s*=/.test(stage),
    'the verify stage references `solved` without declaring it')
  assert.match(stage, /solvedCells/, 'the cell-based count is what this stage reports')
})

test('WIRING: the sign-off prints the arm count the run USED, not the full arm set', () => {
  // A 160-cell smoke (--arms dsh:ptc,dsh:native) was signed off as
  //   "cells : 160  (40 tasks x 10 arms x 2 seeds)"
  // - a real cell count beside an arm count that contradicts it. Same family as 241/240.
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'collect.mjs'), 'utf8')
  assert.match(src, /const armCount = armsArg \?/, 'the arm count must come from --arms when it is given')
  const step = src.split('\n').find((l) => l.includes("step('cells       : '"))
  assert.ok(step, 'the cells sign-off line must exist')
  // A/A PLANS (2026-10-10) pin their own arm list; the sign-off must use that count when it exists
  // and the --arms/harness count otherwise. Same intent: the line must describe the run it launched.
  assert.ok(step.includes('displayArms'), 'the sign-off must print the arm count the run used, not the full set: ' + step)
  // A twin A/A plan (notes/plans/RERUN-PLAN.md) runs its one listed arm twice, so its displayed count doubles.
  assert.match(src, /const displayArms = plan.armsList \? plan.armsList.length( \* \(plan.twin \? 2 : 1\))? : armCount/,
    'displayArms must fall back to armCount, which comes from --arms')
  assert.ok(!step.includes('6 + harnesses.length - 1'), 'and must not carry the hardcoded full-arm formula')
})

test('WIRING: collect.mjs signs off with the cell count, not the record count', () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'collect.mjs'), 'utf8')
  assert.match(src, /from '\.\/cell-counts\.mjs'/, 'collect.mjs must import the counter')
  // A/A plans run PASSES: each pass is its own matrix and its own directory, so the verify stage
  // counts cells against the per-pass plan. cellsPerPass must still come from plan.cells.
  assert.match(src, /countCells\(runs, \{ planned: cellsPerPass \}\)/, 'and count cells against the plan')
  assert.match(src, /const cellsPerPass = plan\.cells \/ passes/, 'cellsPerPass must be plan.cells divided by the pass count')
  assert.match(src, /describeCells\(/, 'and print the cell-first line')
  assert.ok(!/runs\.length \+ '\/' \+ cells \+ ' cells'/.test(src), 'the record-count-as-cells line must not come back')
})
