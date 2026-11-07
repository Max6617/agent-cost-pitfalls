/**
 * collect-verify.test.mjs - rule 9, BOTH halves, decides what the verify stage may call unexplained.
 *
 * THE DEFECT THIS PINS. collect.mjs's verify stage explained a zero-cost run only by an `error`
 * field. On results/batchb-haiku-full/runs.jsonl the Anthropic monthly account limit refused every
 * request of 447 runs, so tools/cost-panel.mjs excluded all 447 under rule 9 (312 by TEXT, 135 by
 * STATUS) while the collector called 444 of them "ZERO-COST ... with no error record" and refused
 * the matrix. Two layers, one dataset, opposite verdicts
 * (notes/defects/INCIDENT-haiku-account-limit-2026-10-09.md).
 *
 * These are PROPERTY tests - the shapes the rule must classify - plus one real-data reconciliation
 * against the analysis meta, not a snapshot of one matrix's output.
 *
 *   node --test tools/collect-verify.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  scanGatewayRuns, rule9Exclusions, unexplainedZeroCost,
  describeRule9Exclusions, carriedSummary, describeCarried,
} from './collect-verify.mjs'
import { countCells } from './cell-counts.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '..')

const run = (over = {}) => ({ task: 't', arm: 'a', seed: 1, runId: 'r', solved: false, ...over })
const requests = (...statuses) => statuses.map((status) => ({ status }))

// ---------------------------------------------------------------- the status half
test('EVERY request 4xx and no error field: rule 9 explains it, it is not unexplained zero-cost', () => {
  const r = run()
  const ex = rule9Exclusions([r], new Map([['r', requests(429, 429, 429)]]))
  assert.equal(ex.count, 1)
  assert.equal(ex.status, 1)
  assert.equal(ex.text, 0)
  assert.equal(ex.noRequests, 0)
  assert.deepEqual(unexplainedZeroCost([r], { spent: new Map(), exclusions: ex }), [],
    'the status half of rule 9 explains every-request-failed; the collector must not call it unexplained')
})

test('ONE 200 among the 4xx is NOT a rule 9 loss and stays unexplained', () => {
  const r = run()
  const ex = rule9Exclusions([r], new Map([['r', requests(429, 200, 429)]]))
  assert.equal(ex.count, 0, 'a mid-run failure is a result, not an infrastructure loss')
  assert.deepEqual(unexplainedZeroCost([r], { spent: new Map(), exclusions: ex }), [r])
})

test('a SOLVED run is never explained away by rule 9', () => {
  const r = run({ solved: true })
  const ex = rule9Exclusions([r], new Map([['r', requests(429, 429)]]))
  assert.equal(ex.count, 0, 'the solved guard is first in exclusionVerdict')
  assert.deepEqual(unexplainedZeroCost([r], { spent: new Map(), exclusions: ex }), [r],
    'a solved run that spent nothing is a data anomaly, not a rule 9 loss')
})

// ---------------------------------------------------------------- the text half
test('the TEXT half explains a run whose requests include a 200 (the case a status-only rule drops)', () => {
  // batchb-haiku holds 3 of these: they spent money before the account limit closed, and the
  // analysis excludes them as rate-limit from their own output. A `half === 'status'` restriction
  // would leave them in the collector's zero-cost bucket.
  const r = run({ stdoutTail: 'dsh: RATE_LIMIT: You have reached your API usage limits' })
  const ex = rule9Exclusions([r], new Map([['r', requests(200, 429)]]))
  assert.equal(ex.count, 1)
  assert.equal(ex.text, 1)
  assert.equal(ex.status, 0)
  assert.deepEqual(unexplainedZeroCost([r], { spent: new Map(), exclusions: ex }), [])
})

test('no gateway record at all is rule 9\'s no-requests clause', () => {
  const r = run()
  const ex = rule9Exclusions([r], new Map())
  assert.equal(ex.status, 1)
  assert.equal(ex.noRequests, 1)
  assert.deepEqual(unexplainedZeroCost([r], { spent: new Map(), exclusions: ex }), [])
})

test('a run that spent money is never in the zero-cost bucket', () => {
  const r = run()
  const ex = rule9Exclusions([r], new Map())
  assert.deepEqual(unexplainedZeroCost([r], { spent: new Map([['r', 0.02]]), exclusions: ex }), [])
})

test('an error field explains a run that rule 9 does not exclude', () => {
  const r = run({ error: 'the harness exited 1 before its first gate' })
  const ex = rule9Exclusions([r], new Map([['r', requests(200)]]))
  assert.equal(ex.count, 0)
  assert.deepEqual(unexplainedZeroCost([r], { spent: new Map(), exclusions: ex }), [])
})

// ---------------------------------------------------------------- carried population
test('the CARRIED population is the analysis population: admitted AND holding usage', () => {
  const runs = [
    run({ task: 't1', runId: 'r1', solved: true }),
    run({ task: 't2', runId: 'r2' }),
    run({ task: 't3', runId: 'r3' }),
    run({ task: 't4', runId: 'r4' }),
  ]
  const tokensByRun = new Map([['r1', 500], ['r2', 500], ['r3', 0], ['r4', 500]])
  const ex = rule9Exclusions(runs, new Map([
    ['r1', requests(200)], ['r2', requests(200)], ['r3', requests(200)], ['r4', requests(429)],
  ]))
  const c = carriedSummary(runs, { exclusions: ex, tokensByRun }, 4)
  assert.equal(ex.count, 1, 'r4 is the all-429 run')
  assert.equal(c.records, 2)
  assert.equal(c.cells, 2)
  assert.equal(c.solvedCells, 1)
  assert.equal(c.absent, 2)
  assert.equal(c.admittedWithoutUsage, 1, 'r3 was admitted by rule 9 but carried no tokens')
  assert.equal(describeCarried(c, 4), 'CARRIED (the analysis population): 2/4 cells, 1 solved (50.0%)')
})

test('the rule 9 line names both clauses, so excluded and carried reconcile on sight', () => {
  assert.equal(
    describeRule9Exclusions({ count: 447, text: 312, status: 135, noRequests: 1 }),
    'rule 9 exclusions: 447 (text 312 / status 135, of which no-requests 1)')
})

// ---------------------------------------------------------------- the scan
test('EVERY gateway log in the run root is scanned - a resumed matrix writes a new one', () => {
  // The scratch directory is LEFT IN %TEMP%: this repo bans rmSync outside tools/safe-fs.mjs, and
  // safe-fs refuses a directory holding *.jsonl (R3 - a record is evidence). matrix-watchdog.test.mjs
  // leaves its own scratch the same way.
  const dir = mkdtempSync(join(tmpdir(), 'bh-verify-'))
  const rec = (over) => JSON.stringify({
    ts: '2026-10-09T00:00:00.000Z', runId: 'r1', syntheticKey: 'exp-dsh-r1',
    model: 'deepseek-flash', status: 200, usage: { cacheMissTokens: 1000 }, ...over,
  })
  writeFileSync(join(dir, 'cm1-anthropic-gateway.jsonl'), rec({}) + '\n' + JSON.stringify({ runId: 'r1', syntheticKey: 'exp-dsh-r1', status: 429 }) + '\n')
  writeFileSync(join(dir, 'cm2-anthropic-gateway.jsonl'), rec({ usage: { cacheMissTokens: 2000 } }) + '\n')
  const gw = scanGatewayRuns(dir)
  assert.equal(gw.files, 2)
  assert.equal(gw.requestsByRun.get('r1').length, 3, 'both logs must answer for the same run')
  assert.ok(gw.spent.get('r1') > 0, 'spend is summed across every log')
})

test('run identity comes from indexByRun, so a mis-filed record is recovered, not dropped', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bh-verify-'))
  writeFileSync(join(dir, 'gateway.jsonl'), JSON.stringify({
    ts: '2026-10-09T00:00:00.000Z', runId: 'wrong-split', syntheticKey: 'exp-opencode-cm1-t1-opencode-s1',
    model: 'deepseek-flash', status: 200, usage: { cacheMissTokens: 1000 },
  }) + '\n')
  const gw = scanGatewayRuns(dir)
  assert.equal(gw.spent.get('wrong-split'), undefined)
  assert.ok(gw.spent.get('cm1-t1-opencode-s1') > 0, 'the syntheticKey runId owns the usage')
  assert.equal(gw.requestsByRun.get('cm1-t1-opencode-s1').length, 1)
})

// ---------------------------------------------------------------- real data
test('REAL DATA: batchb-haiku is 800/800 cells, 447 rule 9 exclusions, 0 unexplained, 353 carried', () => {
  const runsPath = join(repo, 'results', 'batchb-haiku-full', 'runs.jsonl')
  if (!existsSync(runsPath)) return
  const runs = readFileSync(runsPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  // Discover the matrix's own logs rather than listing filenames by hand: collect.mjs writes
  // <matrixId>-gateway.jsonl, and the records carry the matrixId they were collected under.
  const files = [...new Set(runs.map((r) => r.matrixId))].map((id) => id + '-gateway.jsonl')
  const gw = scanGatewayRuns(join(repo, 'results'), { runIds: new Set(runs.map((r) => r.runId)), files })
  const ex = rule9Exclusions(runs, gw.requestsByRun)
  const cc = countCells(runs, { planned: 800 })
  const carried = carriedSummary(runs, { exclusions: ex, tokensByRun: gw.tokensByRun }, 800)

  assert.equal(cc.records, 800)
  assert.equal(cc.cells, 800)
  assert.equal(cc.absent, 0, 'every planned cell holds a record; the 447 are EXCLUDED records, not absent cells')
  assert.equal(ex.count, 447)
  assert.equal(ex.text, 312)
  assert.equal(ex.status, 135)
  assert.equal(ex.noRequests, 1)
  assert.deepEqual(unexplainedZeroCost(runs, { spent: gw.spent, exclusions: ex }), [],
    'the account limit refused every request; rule 9 explains every zero-cost run')
  assert.equal(carried.records, 353)
  assert.equal(carried.cells, 353)
  assert.equal(carried.solvedCells, 206)
  assert.equal(carried.admittedWithoutUsage, 0)
  assert.equal(describeCarried(carried, 800), 'CARRIED (the analysis population): 353/800 cells, 206 solved (58.4%)')

  // THE TWO LAYERS MUST AGREE, on this dataset, from this code.
  const metaPath = join(repo, 'analysis', 'panel-analysis-batchb-2026-10-09.json')
  if (existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8')).meta['batchb-haiku']
    assert.equal(ex.count, meta.excluded + meta.statusExcluded, 'collector exclusions vs analysis meta')
    assert.equal(carried.cells, meta.cells, 'collector carried cells vs analysis meta cells')
    assert.equal(meta.noUsage + meta.zeroUsage, carried.admittedWithoutUsage)
  }
})

// ---------------------------------------------------------------- wiring
test('WIRING: collect.mjs imports the rule instead of re-implementing it, and scans once', () => {
  const src = readFileSync(join(here, 'collect.mjs'), 'utf8')
  assert.match(src, /from '\.\/collect-verify\.mjs'/, 'collect.mjs must import the verify helpers')
  assert.match(src, /scanGatewayRuns\(runRoot/, 'one scan answers spend AND status')
  assert.ok(!/function spendByRun/.test(src), 'the spend-only scan is gone; a second scan is the thing to avoid')
  assert.match(src, /rule9Exclusions\(/)
  assert.match(src, /describeRule9Exclusions\(/)
  assert.match(src, /carriedSummary\(/)
  assert.match(src, /describeCarried\(/)
  assert.ok(!/Number\([^\n]*\.status[^\n]*\)\s*>=\s*400/.test(src), 'the status rule must not be copied inline')
})

test('WIRING: the status rule lives in exclusions.mjs, not in this module', () => {
  const src = readFileSync(join(here, 'collect-verify.mjs'), 'utf8')
  assert.match(src, /from '\.\/exclusions\.mjs'/, 'import the one decision, do not copy it')
  assert.ok(!/>=\s*400/.test(src), 'a copied status threshold is not the shared rule')
})
