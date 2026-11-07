/**
 * cache-regime.test.mjs - A6's DSH / non-DSH split, unit AND call site.
 *
 * A6's `overall` pools EVERY arm of a model into one mean. On Anthropic that pools two cache
 * regimes: the six DSH arms POST to /v1/messages, the one path tools/measure-gateway.mjs can inject
 * a cache_control breakpoint into, and the four external harnesses there use /v1/chat/completions
 * and read 0% on every cell. Sonnet's pooled 0.513 was read as an unexplained anomaly against the
 * matrix's 757/800 solve rate. The split must be additive: `overall` keeps its filed value.
 *
 * The first tests pin the rule on panels small enough to check by hand, including the case the
 * shipped six matrices cannot produce: a side with NO cells. The last one pins the split as the
 * analysis actually reports it, and pins the two filed Anthropic `overall` values to the bit.
 *
 * Run: node --test tools/cache-regime.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { cacheRegimeSplit } from './cache-regime.mjs'
import { mean } from './stats.mjs'

const repo = fileURLToPath(new URL('..', import.meta.url))
const rec = (arm, hitRate) => ({ model: 'm', arm, hitRate })

test('a 90%-DSH / 0%-external model splits into 0.9 and 0.0 with the right cell counts', () => {
  const rows = [
    ...Array.from({ length: 6 }, () => rec('dsh:native', 0.9)),
    ...Array.from({ length: 4 }, () => rec('opencode', 0)),
  ]
  const s = cacheRegimeSplit(rows)
  assert.equal(s.dshCells, 6)
  assert.equal(s.nonDshCells, 4)
  assert.equal(s.dshHitRate, 0.9)
  assert.equal(s.nonDshHitRate, 0)
  // The number a reader would otherwise be handed is the mean over all ten cells, and the split is
  // a DECOMPOSITION of it, not a replacement: 0.54 = (6 x 0.9 + 4 x 0.0) / 10.
  const pooled = mean(rows.map((r) => r.hitRate))
  assert.ok(Math.abs(pooled - 0.54) < 1e-12, 'the pooled mean is 0.54: ' + pooled)
  assert.ok(Math.abs((s.dshHitRate * s.dshCells + s.nonDshHitRate * s.nonDshCells) / 10 - pooled) < 1e-12,
    'the split must reproduce the pooled mean it explains')
})

test('a side with no cells is null, never 0', () => {
  const dshOnly = cacheRegimeSplit([rec('dsh:ptc', 0.8), rec('dsh:native', 1)])
  assert.equal(dshOnly.nonDshCells, 0)
  assert.equal(dshOnly.nonDshHitRate, null, 'nothing was measured on the non-dsh side, so it is null')
  assert.equal(dshOnly.dshHitRate, 0.9)

  const extOnly = cacheRegimeSplit([rec('goose', 0), rec('cline', 0.5)])
  assert.equal(extOnly.dshCells, 0)
  assert.equal(extOnly.dshHitRate, null, 'nothing was measured on the dsh side, so it is null')
  assert.equal(extOnly.nonDshHitRate, 0.25)

  // The failure this rule exists to prevent: an unmeasured side printing as a measured zero.
  assert.notEqual(cacheRegimeSplit([rec('goose', 0)]).dshHitRate, 0)
})

test('a cell whose usage split is unknown counts as 0, exactly as A6 overall counts it', () => {
  // panel rows carry hitRate null when a run reported no cacheable input tokens; A6's overall has
  // always counted those as 0 (r.hitRate ?? 0). The split must use the same rule or the two views
  // stop decomposing each other.
  const s = cacheRegimeSplit([rec('dsh:native', null), rec('dsh:ptc', 1), rec('opencode', 0.5)])
  assert.equal(s.dshHitRate, 0.5)
  assert.equal(s.nonDshHitRate, 0.5)
})

test('A6 reports the split per model and leaves overall exactly as filed', { timeout: 300000 }, () => {
  const outPath = repo + 'results/_scratch/panel-analysis-a6.test.json'
  execFileSync(process.execPath, ['tools/panel-analysis.mjs', '--json', outPath], { cwd: repo, stdio: 'pipe' })
  const a6 = JSON.parse(readFileSync(outPath, 'utf8')).sections.A6
  assert.ok(Array.isArray(a6) && a6.length, 'A6 must report one row per model')

  // A side with NO cells is null, never 0: "nothing was measured" must not print as "measured zero".
  const sideIsHonest = (row, cells, hitRate, side) => {
    if (cells === 0) assert.equal(hitRate, null, row.model + ': the ' + side + ' side has no cells, so it is null, not ' + hitRate)
    else {
      assert.equal(typeof hitRate, 'number', row.model + ': the ' + side + ' side has cells, so it has a rate')
      assert.ok(hitRate >= 0 && hitRate <= 1, row.model + ': ' + side + ' hit rate out of range: ' + hitRate)
    }
  }

  for (const row of a6) {
    for (const k of ['dshHitRate', 'dshCells', 'nonDshHitRate', 'nonDshCells', 'note']) {
      assert.ok(k in row, row.model + ': A6 must carry ' + k)
    }
    assert.equal(typeof row.note, 'string', row.model + ': the note must be a string')
    assert.ok(row.note.length > 0, row.model + ': the split must say what it means')
    assert.ok(row.dshCells > 0 && row.nonDshCells > 0, row.model + ': every shipped matrix ran both sides')
    sideIsHonest(row, row.dshCells, row.dshHitRate, 'dsh')
    sideIsHonest(row, row.nonDshCells, row.nonDshHitRate, 'non-dsh')
    // The split is a DECOMPOSITION of overall, not a replacement: weighted by its own cell counts it
    // reproduces the pooled number, so the two views can never drift apart.
    const pooled = (row.dshHitRate * row.dshCells + row.nonDshHitRate * row.nonDshCells) / (row.dshCells + row.nonDshCells)
    assert.ok(Math.abs(pooled - row.overall) < 1e-12,
      row.model + ': the split must reproduce overall (' + pooled + ' vs ' + row.overall + ')')
  }

  // The filed overall values, to the bit. If one of these moves, a filed document moved with it.
  const FILED = { 'claude-sonnet-5.5': 0.5127810040288214, 'claude-haiku-4.5': 0.5585598980529433 }
  const byModel = new Map(a6.map((r) => [r.model, r]))
  for (const [model, overall] of Object.entries(FILED)) {
    const row = byModel.get(model)
    assert.ok(row, model + ' must be in A6')
    assert.equal(row.overall, overall, model + ': overall is the filed value and the split must not change it')
    // Every non-dsh cell on Anthropic reads exactly 0 - the path cannot carry an injected breakpoint -
    // while the DSH arms read 85-93%. Pooling them into one mean is the 0.513.
    assert.equal(row.nonDshHitRate, 0, model + ': the non-dsh side is a measured 0 on Anthropic')
    assert.ok(row.dshHitRate > 0.8, model + ': the DSH side is the real cache regime (' + row.dshHitRate + ')')
    assert.equal(row.dshCells, 372, model + ': 6 arms x 31 tasks x 2 seeds')
    assert.equal(row.nonDshCells, 248, model + ': 4 arms x 31 tasks x 2 seeds')
  }
  // Off Anthropic, prefix caching is automatic, so the split separates harnesses and not regimes.
  for (const row of a6.filter((r) => r.provider !== 'Anthropic')) {
    assert.ok(row.dshHitRate > 0 && row.nonDshHitRate > 0,
      row.model + ': both sides hit cache on this provider, so neither may read as an unmeasured or dead side')
  }
})
