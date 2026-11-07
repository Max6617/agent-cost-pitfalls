/**
 * study-window.test.mjs - the declared cut-off, and the proof that it excludes exactly what it says.
 *
 * The cut-off exists because the size of the 2026-10-04 luna drift depends on when a runaway process
 * was killed, not on the experiment (notes/defects/EVIDENCE-DRIFT-2026-10-04.md). These tests assert the property:
 * closed matrices are bounded, open matrices are NOT, and the exclusion is counted rather than silent.
 *
 * Run: node --test tools/study-window.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CLOSED_MATRICES, cutoffFor, afterCutoff } from './study-window.mjs'
import { buildPanel } from './cost-panel.mjs'

const DRIFT = 'results/cmure98qw-openai-gateway.jsonl'
const rows = () => readFileSync(DRIFT, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))

test('the cut-off is declared once and covers the matrix that drifted', () => {
  assert.equal(cutoffFor('luna-full'), CLOSED_MATRICES['luna-full'].cutoff)
  assert.ok(CLOSED_MATRICES['luna-full'].why.length > 20, 'a cut-off without a written reason is a fudge')
})

test('an OPEN matrix has no cut-off - new collection must never be silently ignored', () => {
  assert.equal(cutoffFor('ds-full'), null)
  assert.equal(afterCutoff('ds-full', '2099-01-01T00:00:00Z'), false)
})

test('the boundary is inclusive and the instant is the artifact build', () => {
  assert.equal(afterCutoff('luna-full', '2026-10-04T06:01:56.999Z'), false)
  assert.equal(afterCutoff('luna-full', '2026-10-04T06:01:57.000Z'), true)
  assert.equal(afterCutoff('luna-full', '2026-10-04T06:13:18.202Z'), true)
})

test('REAL DATA: the drift is exactly the records at or after the cut-off, and they are all one run', () => {
  const late = rows().filter((r) => afterCutoff('luna-full', r.ts))
  assert.equal(late.length, 15, 'the drift is 15 records - if this moves, the log moved again')
  assert.equal(new Set(late.map((r) => r.runId)).size, 1)
  const early = rows().filter((r) => !afterCutoff('luna-full', r.ts))
  assert.ok(early.length > 9000, 'the legitimate body of the log must be untouched by the cut-off')
})

test('WIRING: the panel reports how many records the cut-off excluded, per dataset', () => {
  const { meta } = buildPanel()
  assert.equal(meta['luna-full'].postCutoff, 15, 'the exclusion must be counted, never silent')
  for (const id of ['ds-full', 'glm-flash', 'qwen-full', 'haiku-full', 'sonnet-full']) {
    assert.equal(meta[id].postCutoff ?? 0, 0, id + ' has no cut-off and must exclude nothing')
  }
})
import { inFlightLogs } from './study-window.mjs'

test('inFlightLogs names the logs a live pipeline is writing, by path and by basename', () => {
  const s = { gateways: [{ p: 'deepseek', log: 'C:\\Users\\user\\betterharness\\results\\cmuti3u5l-deepseek-gateway.jsonl' }] }
  const set = inFlightLogs(s)
  assert.ok(set.has('cmuti3u5l-deepseek-gateway.jsonl'), 'the basename must match whatever path form is used')
  assert.ok(set.has('c:/users/user/betterharness/results/cmuti3u5l-deepseek-gateway.jsonl'))
})

test('an empty or gateway-less status names nothing - the rule must not over-exclude', () => {
  assert.equal(inFlightLogs(null).size, 0)
  assert.equal(inFlightLogs({}).size, 0)
  assert.equal(inFlightLogs({ gateways: [{}] }).size, 0)
})

test('WIRING: artifact.mjs keeps an in-flight log out of the signed-off inputs', () => {
  const src = readFileSync('tools/artifact.mjs', 'utf8')
  assert.match(src, /inFlightLogs/, 'the manifest must exclude a log that is still growing')
  assert.match(src, /inFlight/, 'and it must RECORD the exclusion rather than silently dropping it')
})
