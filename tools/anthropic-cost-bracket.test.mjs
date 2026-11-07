/**
 * anthropic-cost-bracket.test.mjs - normaliser + reconciliation for the Anthropic cost bracket.
 *
 * notes/defects/DEFECT-anthropic-external-costs.md: for the external-harness requests in the Anthropic matrices the
 * archive records no cache split, so no tool can price them exactly. costOf priced them at zero and
 * cost-panel at the miss rate; the two differ by ~2.3x on the batch-1 pair and the upper one exceeds
 * the session ledger. The fix is a bracket, and these tests assert the two properties that make it
 * one, rather than checking a hardcoded total:
 *
 *   NORMALISER     the same tokens priced at the miss, cache-read and write rates land on the card's
 *                  published numbers, and the bracket's ends ARE those two readings;
 *   RECONCILIATION the pair's bracket contains the ledger's implied figure, the published per-run
 *                  brackets from the defect record are reproduced, and the all-miss bound as a point
 *                  estimate is refuted by the ledger rather than quoted.
 *
 * Run: node --test tools/anthropic-cost-bracket.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { costOf, costBounds, cardFor } from './prices.mjs'
import { analyse, incrementAt, ANTHROPIC_DATASETS, LEDGER_DATASET_IDS, LEDGER_USD } from './anthropic-cost-bracket.mjs'

const HAIKU = 'claude-haiku-4.5'
const SONNET = 'claude-sonnet-5.5'

test('NORMALISER: a million tokens land on the card rate for miss, cache read and write', () => {
  for (const model of [HAIKU, SONNET]) {
    const c = cardFor(model, { required: true })
    assert.equal(costOf(model, { cacheMissTokens: 1e6 }), c.miss, model + ' miss rate')
    assert.equal(costOf(model, { cacheHitTokens: 1e6 }), c.hit, model + ' cache-read rate')
    assert.equal(costOf(model, { cacheCreationTokens: 1e6 }), c.write ?? c.miss, model + ' write rate')
    assert.equal(costOf(model, { outputTokens: 1e6 }), c.out, model + ' output rate')
  }
})

test('NORMALISER: the bracket ends are the two card readings, and the increment spans them', () => {
  const N = 1_000_000, OUT = 1234
  for (const model of [HAIKU, SONNET]) {
    const c = cardFor(model, { required: true })
    const unknown = { inputTokens: N, outputTokens: OUT, cacheHitTokens: null, cacheMissTokens: null }
    const b = costBounds(model, unknown)
    assert.equal(b.exact, false)
    // The low end is the same tokens priced as a cache READ, the high end as a MISS.
    assert.equal(b.low, costOf(model, { cacheHitTokens: N, cacheMissTokens: 0, outputTokens: OUT }))
    assert.equal(b.high, costOf(model, { cacheMissTokens: N, cacheHitTokens: 0, outputTokens: OUT }))
    // The increment is zero at the low end and the whole spread at the high end, and it is linear.
    assert.equal(incrementAt(c, N, 0), 0)
    assert.ok(Math.abs(incrementAt(c, N, 1) - (b.high - b.low)) < 1e-12)
    assert.ok(Math.abs(incrementAt(c, N, 0.5) - (b.high - b.low) / 2) < 1e-12)
    // Monotone: a larger unreported share can never be cheaper.
    let prev = -Infinity
    for (const s of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const v = incrementAt(c, N, s)
      assert.ok(v > prev, 'increment must be increasing in the share')
      prev = v
    }
    assert.throws(() => incrementAt(c, N, 1.5), /share/)
    assert.throws(() => incrementAt(c, N, -0.1), /share/)
  }
})

test('NORMALISER: the write rate is a distinct bucket, not a second miss charge', () => {
  // The pre-registered function bills creation at the write rate when the card has one, and the
  // buckets are disjoint (prices.mjs:134-143). A card without a write rate bills creation as a miss.
  const withWrite = costOf(HAIKU, { cacheCreationTokens: 1e6, cacheMissTokens: 1e6 })
  assert.equal(withWrite, 1.25 + 1.00, 'haiku: creation at write + miss at miss')
  const noWrite = costOf('deepseek-flash', { cacheCreationTokens: 1e6, cacheMissTokens: 1e6 })
  assert.equal(noWrite, 0.15 + 0.15, 'a card with no write rate bills creation at the miss rate')
})

// ---- reconciliation, on the archive ---------------------------------------------------------

const r = analyse()

test('the tool covers both Anthropic suites and the ledger names the batch-1 pair', () => {
  const ids = ANTHROPIC_DATASETS.map((d) => d.id)
  assert.ok(ids.includes('haiku-full') && ids.includes('sonnet-full'), 'batch 1 in scope')
  assert.ok(ids.includes('batchb-haiku') && ids.includes('batchb-sonnet'), 'tasks-b in scope')
  for (const id of LEDGER_DATASET_IDS) assert.ok(ids.includes(id), 'ledger dataset in scope: ' + id)
  assert.deepEqual(r.batch1.datasets, LEDGER_DATASET_IDS)
})

test('every row brackets its own point, and the point is inside the bounds by construction', () => {
  for (const m of r.models) {
    assert.ok(m.lowUsd <= m.pointDshShareUsd, m.dataset + ': point below the floor')
    assert.ok(m.pointDshShareUsd <= m.highUsd, m.dataset + ': point above the ceiling')
    assert.ok(m.lowUsd <= m.midpointUsd && m.midpointUsd <= m.highUsd, m.dataset + ': midpoint outside')
    assert.ok(m.unknownRequests > 0, m.dataset + ': an Anthropic matrix with no unknown split would make this test vacuous')
    assert.ok(m.unknownInputTokens > 0, m.dataset + ': unknown tokens must be counted, not assumed')
  }
  assert.ok(r.batch1.lowUsd <= r.batch1.pointDshShareUsd)
  assert.ok(r.batch1.pointDshShareUsd <= r.batch1.highUsd)
})

test('RECONCILIATION: the batch-1 bracket contains the ledger, and the ledger caps the top', () => {
  const b = r.batch1
  assert.equal(b.ledgerUsd, LEDGER_USD)
  assert.ok(b.lowUsd <= b.ledgerUsd, 'the cache-read floor cannot exceed the ledger')
  assert.ok(b.ledgerUsd <= b.highUsd, 'the ledger must be inside the all-miss bound')
  assert.equal(b.capApplies, true)
  assert.equal(b.reconciledHighUsd, Math.min(b.highUsd, b.ledgerUsd))
  assert.ok(b.pointReconciledUsd >= b.lowUsd && b.pointReconciledUsd <= b.reconciledHighUsd,
    'the reconciled point must sit inside the reconciled bracket')
  assert.ok(Math.abs(b.impliedPerRunUsd - b.ledgerUsd / b.cells) < 1e-4,
    'the implied per-run is the ledger over the cells, to the rounding of the record')
  assert.ok(b.impliedCacheReadShare >= 0 && b.impliedCacheReadShare <= 1)
})

test('RECONCILIATION: the all-miss bound and the DSH-share point are BOTH refuted by the ledger', () => {
  // This is the defect's own conclusion, asserted rather than described: the panel's reading cannot
  // be a statement about money spent, because the money spent is capped below it.
  assert.ok(r.batch1.highUsd > LEDGER_USD,
    'the all-miss bound (' + r.batch1.highUsd + ') must exceed the ledger (' + LEDGER_USD + ')')
  assert.ok(r.batch1.pointDshShareUsd > LEDGER_USD,
    'imputing the DSH arms own cache share still exceeds the ledger, so the point is refuted too')
  assert.ok(r.batch1.impliedCacheReadShare < 0.5,
    'the ledger implies the unreported input was READ FAR LESS than the DSH arms read theirs')
  assert.ok(r.dshHitSharePooled > 0.8, 'the DSH arms own share is high; that is why the imputation overshoots')
})

test('RECONCILIATION: the published figures of the defect record are reproduced', () => {
  const byId = new Map(r.models.map((m) => [m.dataset, m]))
  const haiku = byId.get('haiku-full'), sonnet = byId.get('sonnet-full')
  // The record's panel totals for the two matrices: 143.35 and 123.52.
  assert.ok(Math.abs(haiku.highUsd - 143.35) < 0.10, 'haiku all-miss total: ' + haiku.highUsd)
  assert.ok(Math.abs(sonnet.highUsd - 123.52) < 0.10, 'sonnet all-miss total: ' + sonnet.highUsd)
  assert.ok(Math.abs(r.batch1.highUsd - 266.87) < 0.20, 'pair all-miss total: ' + r.batch1.highUsd)
  // The record's published per-run brackets: haiku 0.105-0.233, sonnet 0.082-0.202. The tool's scope
  // is matrix requests only, which is slightly narrower than the record's log-wide reading.
  assert.ok(Math.abs(haiku.perRunLowUsd - 0.105) <= 0.003, 'haiku per-run low: ' + haiku.perRunLowUsd)
  assert.ok(Math.abs(haiku.perRunHighUsd - 0.233) <= 0.003, 'haiku per-run high: ' + haiku.perRunHighUsd)
  assert.ok(Math.abs(sonnet.perRunLowUsd - 0.082) <= 0.003, 'sonnet per-run low: ' + sonnet.perRunLowUsd)
  assert.ok(Math.abs(sonnet.perRunHighUsd - 0.202) <= 0.003, 'sonnet per-run high: ' + sonnet.perRunHighUsd)
  // And the pair's published per-run cap: at most 0.1164.
  assert.ok(Math.abs(r.batch1.impliedPerRunUsd - 0.1164) <= 0.0002, 'implied per-run: ' + r.batch1.impliedPerRunUsd)
})

test('the unknown-cache population is the defect record\'s, to the request', () => {
  // The record counts every request in the logs (6,772 carrying 129.3M input tokens); this tool counts
  // the MATRIX requests (whose runId is a record in runs.jsonl), which is the population the panel prices.
  const n = r.batch1.unknownRequests, tok = r.batch1.unknownInputTokens
  assert.ok(n >= 6600 && n <= 6800, 'batch-1 unknown requests: ' + n)
  assert.ok(tok >= 127e6 && tok <= 130e6, 'batch-1 unknown input tokens: ' + tok)
  assert.ok(r.batch1.requests > r.batch1.unknownRequests, 'some requests on this path do report a split')
})

test('the tasks-b pair is carried WITHOUT the ledger cap, and says so', () => {
  assert.ok(r.otherSuites, 'the tasks-b matrices are in scope')
  assert.equal(r.otherSuites.cells, 1600, 'tasks-b: 40 tasks x 10 arms x 2 seeds x 2 models')
  assert.ok(r.otherSuites.lowUsd < r.otherSuites.highUsd, 'tasks-b brackets too')
  assert.ok(!('ledgerUsd' in r.otherSuites), 'no ledger cap may be attached outside its window')
})
