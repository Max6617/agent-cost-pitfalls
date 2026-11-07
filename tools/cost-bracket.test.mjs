/**
 * cost-bracket.test.mjs - an unknown cache split must be carried, never invented.
 *
 * notes/defects/DEFECT-anthropic-external-costs.md: for 6,772 external-harness requests on Anthropic the archive
 * does not record the cache split. costOf prices that input at zero; cost-panel prices it at the miss
 * rate. They differ by ~10x and both printed a number. These tests assert the property instead:
 * a caller gets a bracket, and the bracket collapses only when the split is actually known.
 *
 * Run: node --test tools/cost-bracket.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { cacheSplitUnknown, costBounds, costOf } from './prices.mjs'

const unknown = { inputTokens: 1000, outputTokens: 10, cacheHitTokens: null, cacheMissTokens: null }
const known = { inputTokens: 1000, outputTokens: 10, cacheHitTokens: 800, cacheMissTokens: 200 }
const M = 'claude-haiku-4-5'

test('a null cache split is UNKNOWN - not zero, and not a miss', () => {
  assert.equal(cacheSplitUnknown(unknown), true)
  assert.equal(cacheSplitUnknown(known), false)
  assert.equal(cacheSplitUnknown({ inputTokens: 10, cacheHitTokens: 0, cacheMissTokens: 10 }), false,
    'an explicit zero hit is a REPORTED zero, not an unknown')
  assert.equal(cacheSplitUnknown({ inputTokens: 0, cacheHitTokens: null, cacheMissTokens: null }), false,
    'no input tokens means nothing to price, so there is nothing unknown')
})

test('the bounds bracket an unknown split and collapse when it is known', () => {
  const b = costBounds(M, unknown)
  assert.equal(b.exact, false)
  assert.ok(b.low < b.high, 'an unknown split must bracket, not pick a side')
  const k = costBounds(M, known)
  assert.equal(k.exact, true)
  assert.equal(k.low, k.high)
  assert.equal(k.low, costOf(M, known))
})

test('the high end is the miss-rate reading and the low end is the cache-read reading', () => {
  const b = costBounds(M, unknown)
  assert.ok(Math.abs(b.high - costOf(M, { cacheMissTokens: 1000, outputTokens: 10 })) < 1e-12)
  assert.ok(Math.abs(b.low - costOf(M, { cacheHitTokens: 1000, outputTokens: 10 })) < 1e-12)
})

const runsOf = (id) => new Set(readFileSync('results/' + id + '/runs.jsonl', 'utf8')
  .split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l).runId))

function scan (ids) {
  let unknownReq = 0, total = 0
  const byHarness = new Map()
  for (const f of readdirSync('results').filter((f) => /gateway.*\.jsonl$/.test(f))) {
    for (const line of readFileSync('results/' + f, 'utf8').split('\n')) {
      if (!line.trim()) continue
      let o; try { o = JSON.parse(line) } catch { continue }
      if (!o.usage || !o.runId || !ids.has(o.runId)) continue
      total++
      const bad = cacheSplitUnknown(o.usage)
      if (bad) unknownReq++
      const h = byHarness.get(o.harness) ?? { n: 0, unknown: 0 }
      h.n++; if (bad) h.unknown++
      byHarness.set(o.harness, h)
    }
  }
  return { unknownReq, total, byHarness }
}

test('REAL DATA: the four cheap matrices report their cache split on every request', () => {
  for (const id of ['ds-full', 'glm-flash', 'luna-full', 'qwen-full']) {
    const { unknownReq, total } = scan(runsOf(id))
    assert.equal(unknownReq, 0, id + ': ' + unknownReq + ' of ' + total + ' requests have an unknown split')
  }
})

test('REAL DATA: on Anthropic the split is known for every DSH request and unknown for the external four', () => {
  const { byHarness } = scan(runsOf('haiku-full'))
  assert.equal(byHarness.get('dsh').unknown, 0, 'every DSH request on haiku reports its split')
  assert.ok(byHarness.get('dsh').n > 1000)
  const ext = ['cline', 'goose', 'opencode', 'openhands']
  for (const h of ext) {
    const v = byHarness.get(h)
    assert.ok(v && v.unknown > 0, h + ' should be an unknown-split path')
    assert.equal(v.unknown, v.n, h + ': the unknown split should be EVERY request, not some')
  }
})
