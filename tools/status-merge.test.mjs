/**
 * status-merge.test.mjs - a new run must not inherit the last run's numbers.
 *
 * notes/defects/LIVE-DEFECTS-2026-10-04.md section 1: during the hard-suite pilot the status file showed the
 * sonnet matrix's records 620 / solved 618 beside the pilot's own stage and spend. The file is
 * watched during long runs, so a stale number there is read as progress.
 *
 * Run: node --test tools/status-merge.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeStatus } from './status-merge.mjs'

const SONNET = { matrixId: 'cmussrbtr', provider: 'anthropic-sonnet', records: 620, cells: 620, solved: 618, runs: 619, stage: 'done' }

test('a NEW matrixId starts clean - no run-scoped number survives', () => {
  const next = mergeStatus(SONNET, { matrixId: 'cmuti3u5l', plan: 'hard', stage: 'matrix', spendUsd: 0 })
  assert.equal(next.stage, 'matrix')
  assert.equal(next.spendUsd, 0)
  for (const k of ['provider', 'records', 'cells', 'solved', 'runs']) {
    assert.equal(next[k], undefined, k + ' is the previous run and must not survive the boundary')
  }
})

test('the SAME matrixId keeps merging - incremental updates still work', () => {
  const a = mergeStatus({ matrixId: 'm1', stage: 'plan' }, { matrixId: 'm1', stage: 'matrix', spendUsd: 0 })
  const b = mergeStatus(a, { recordCount: 120 })
  assert.equal(b.matrixId, 'm1')
  assert.equal(b.stage, 'matrix')
  assert.equal(b.recordCount, 120)
})

test('failedStage is cleared on every write, which is why it is here at all', () => {
  assert.equal(mergeStatus({ matrixId: 'm1', failedStage: 'preflight' }, { spendUsd: 1 }).failedStage, null)
  assert.equal(mergeStatus(SONNET, { matrixId: 'm2', failedStage: 'verify' }).failedStage, 'verify',
    'a patch that sets it explicitly still wins - the caller re-sets it')
})

test('an empty file and a missing matrixId are not a boundary in themselves', () => {
  assert.equal(mergeStatus({}, { matrixId: 'm1', stage: 'plan' }).stage, 'plan')
  assert.equal(mergeStatus({ stage: 'plan' }, { spendUsd: 0 }).stage, 'plan', 'no matrixId yet means the first patch')
})
import { readFileSync } from 'node:fs'

test('WIRING: collect.mjs merges through this module, not an inline spread', () => {
  const src = readFileSync('tools/collect.mjs', 'utf8')
  assert.match(src, /mergeStatus/, 'collect.mjs must use the one merge rule')
  assert.ok(!/\{\s*\.\.\.cur,\s*failedStage:\s*null/.test(src),
    'the inline merge is what let a finished run\'s numbers sit in the file through the next run')
})
