/**
 * ranking-adjusted.test.mjs - the sensitivity tool must reproduce the FILED A8/A1b numbers on raw
 * costs before its adjusted column can be believed.
 *
 * Run: node --test tools/ranking-adjusted.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyse, tieFraction, medianRho, stepFunction } from './ranking-adjusted.mjs'
import { buildPanel, MODELS } from './cost-panel.mjs'

test('the raw column reproduces the filed A8 and A1b statistics', () => {
  const { panel } = buildPanel({ datasets: ['ds-full', 'glm-flash', 'qwen-full', 'luna-full', 'haiku-full', 'sonnet-full'] })
  const models = Object.keys(MODELS).filter((m) => panel.some((r) => r.model === m))
  const ties = tieFraction(panel, models, { iters: 2000, seed: 12345 })
  const rho = medianRho(panel, models)
  assert.equal(ties.pairs, 54)
  assert.equal(ties.ties, 40, 'batch-1 raw tie fraction must be the filed 40/54')
  assert.ok(Math.abs(rho.medianRho - 0.238) < 0.001, 'batch-1 raw median rho must be the filed 0.238')
})

test('the step function is fitted per model and is finite', () => {
  const { panel } = buildPanel({ datasets: ['ds-full', 'glm-flash'] })
  for (const m of ['deepseek-flash', 'glm-5.3-flash']) {
    const s = stepFunction(panel, m)
    assert.ok(s.pairs >= 2, 'a position effect needs at least two distinct position pairs')
    assert.ok(s.cols.length > 0)
    for (const p of s.cols) assert.ok(Number.isFinite(s.f(p)))
    assert.equal(s.f(0), 0, 'the reference position is 0 by construction')
  }
})
