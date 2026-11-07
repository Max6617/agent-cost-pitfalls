/**
 * common-f-check.test.mjs - the "arm-specific f is untestable on this design" claim must be computed,
 * not asserted. Written BEFORE tools/common-f-check.mjs existed, and watched fail on the missing
 * import; the tool then made it pass.
 *
 * Run: node --test tools/common-f-check.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { analyse, COMMON_F_SE_THRESHOLD } from './common-f-check.mjs'

const SUITES = ['batch1', 'batchb']

test('every model on both suites carries both fits', () => {
  const out = analyse()
  for (const s of SUITES) {
    assert.ok(out.suites[s], s + ' missing')
    const ms = out.suites[s].models
    assert.equal(ms.length, 6, s + ' must carry six models')
    for (const r of ms) {
      assert.ok(Number.isFinite(r.commonPct), r.model + ' common pct')
      assert.ok(Number.isFinite(r.armSpecificPct), r.model + ' arm-specific pct')
      assert.ok(Number.isFinite(r.armSpecificSeLog), r.model + ' arm-specific se')
      assert.ok(Number.isFinite(r.swingPp), r.model + ' swing')
      assert.ok(r.params >= 18, 'the arm-specific form must be the ~18-parameter one: ' + r.model)
    }
  }
})

test('the common-f column reproduces the filed position-adjust estimate', () => {
  const out = analyse()
  const filed = JSON.parse(readFileSync('analysis/position-adjust-6model-2026-10-09.json', 'utf8'))
  for (const m of filed.models) {
    const mine = out.suites.batch1.models.find((r) => r.model === m.model)
    if (!mine) continue
    assert.ok(Math.abs(mine.commonPct - m.adjustedLog.pct) < 0.05, m.model + ' common-f pct vs filed: ' + mine.commonPct + ' vs ' + m.adjustedLog.pct)
  }
})

test('the untestability is not uniform: batch-1 identifies nothing, tasks-b identifies two', () => {
  // Filing the nuance rather than the slogan: on batch-1 every model's arm-specific intercept has
  // SE > 0.2 log units; on tasks-b two models fall below it (Sonnet 0.145, DeepSeek 0.174), so "the
  // design cannot test arm-specific f" is exactly true of batch-1 and true of four of six on tasks-b.
  const out = analyse()
  const b1 = out.suites.batch1.models
  assert.ok(b1.every((r) => r.armSpecificSeLog > COMMON_F_SE_THRESHOLD), 'no batch-1 model may be identified')
  const identified = out.suites.batchb.models.filter((r) => r.armSpecificSeLog <= COMMON_F_SE_THRESHOLD).map((r) => r.model).sort()
  assert.deepEqual(identified, ['claude-sonnet-5.5', 'deepseek-flash'], 'the tasks-b models whose SE falls below the threshold')
})

test('the arm-specific intercept is not identified: its SE is large', () => {
  // The threshold is 0.2 log units: a 0.2 SE on alpha is about +/-22% on the percent scale, larger
  // than every adjusted effect this paper reports except haiku's, so an arm-specific estimate at this
  // resolution cannot arbitrate whether f differs by arm.
  assert.equal(COMMON_F_SE_THRESHOLD, 0.2)
  const out = analyse()
  for (const model of ['glm-5.3-flash', 'qwen3.8-flash']) {
    const r = out.suites.batch1.models.find((x) => x.model === model)
    assert.ok(r.armSpecificSeLog > COMMON_F_SE_THRESHOLD, model + ' SE ' + r.armSpecificSeLog + ' must exceed ' + COMMON_F_SE_THRESHOLD)
  }
})
