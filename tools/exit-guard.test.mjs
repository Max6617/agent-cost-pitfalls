/**
 * exit-guard.test.mjs - a runner that finished every cell and never exits must not stall the pipeline.
 *
 * THE LIVE CASE, 2026-10-07. luna wrote its 800th cell at 19:24:50Z and its runner never exited. The
 * collector waited TWO HOURS AND FORTY-FIVE MINUTES, printing one dot every ~20 s, and neither
 * watchdog fired - because both stand down once the matrix is complete, by design, so that a runner
 * doing its local backup and commit is not killed. Nothing covered the other half: complete and never
 * exiting. All 800 cells were on disk and committed the whole time; the pipeline simply never advanced.
 *
 * The guard is deliberately narrow - it can only fire AFTER completion - so it cannot reproduce the
 * 2026-10-02 kill of a healthy OpenAI matrix that was writing its own backup.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { exitGuardVerdict } from './exit-guard.mjs'

const MIN = 60000

test('an incomplete matrix is never touched by this guard', () => {
  assert.equal(exitGuardVerdict({ now: 1000 * MIN, completeSinceMs: null, lastRunTs: 0, stallMs: 15 * MIN }), null,
    'the silence watchdogs own the incomplete case')
})

test('a completed runner is left alone while it works', () => {
  const now = 100 * MIN
  assert.equal(exitGuardVerdict({ now, completeSinceMs: now - 5 * MIN, lastRunTs: now - 5 * MIN, stallMs: 15 * MIN }), null)
})

test('THE DEFECT: a completed runner silent past the limit is killed', () => {
  const now = 100 * MIN
  const v = exitGuardVerdict({ now, completeSinceMs: now - 45 * MIN, lastRunTs: now - 45 * MIN, stallMs: 15 * MIN })
  assert.match(String(v), /complete/i)
  assert.match(String(v), /not exited/i)
})

test('a NEW record after completion restarts the clock: a retried cell is real work', () => {
  const now = 100 * MIN
  assert.equal(exitGuardVerdict({ now, completeSinceMs: now - 60 * MIN, lastRunTs: now - 2 * MIN, stallMs: 15 * MIN }), null,
    'the runner is still producing, whatever the completion time says')
})

test('exactly at the limit is not yet a kill, one millisecond past is', () => {
  const now = 100 * MIN
  assert.equal(exitGuardVerdict({ now, completeSinceMs: now - 15 * MIN, lastRunTs: now - 15 * MIN, stallMs: 15 * MIN }), null)
  assert.ok(exitGuardVerdict({ now, completeSinceMs: now - 15 * MIN - 1, lastRunTs: now - 15 * MIN - 1, stallMs: 15 * MIN }))
})

test('the verdict names the silence, so the log explains itself', () => {
  const now = 100 * MIN
  const v = exitGuardVerdict({ now, completeSinceMs: now - 30 * MIN, lastRunTs: now - 30 * MIN, stallMs: 15 * MIN })
  assert.match(String(v), /30 min|30\.0 min/, 'the operator should see how long it waited')
})