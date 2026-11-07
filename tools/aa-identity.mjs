/**
 * aa-identity.mjs - the byte-identity gate for an interleaved A/A (notes/plans/RERUN-PLAN.md block B).
 *
 * An A/A is only a control if the two copies send the provider the same bytes. notes/plans/AA-PLACEBO-PLAN.md made
 * that the acceptance gate for the first A/A, checked by hand. This makes it a command: for every
 * (task, seed) block of a twin matrix it compares the FIRST main request (the one carrying tools) and
 * the FIRST auxiliary request (DSH's tool-less, max_tokens 64 call) of `dsh:native` and its twin, by
 * the gateway's requestHash (sha256 of the raw request body, tools/measure-gateway.mjs).
 *
 * Run it on the smoke before the full A/A: if any main-request pair differs, STOP - the copies are
 * distinguishable and the run would not be an A/A.
 *
 * Usage: node tools/aa-identity.mjs --runs results/rerun-aa-smoke-ds-full/runs.jsonl
 *        exits 1 if any main-request pair differs or a block has no request to compare.
 */
import { readFileSync, existsSync } from 'node:fs'
import { parseSyntheticKey } from './attribute.mjs'
import { discoverGateways } from './cost-panel.mjs'

const NATIVE = 'dsh:native'
const TWIN = 'dsh:native-twin'
const isAux = (g) => g.maxTokens === 64 && !(g.tools > 0)

/** Pure: runs (records) and gateway records in, the per-block comparison out. */
export function identityReport (runs, gatewayRecords) {
  const byRun = new Map()
  for (const g of gatewayRecords) {
    const id = parseSyntheticKey(g.syntheticKey)?.runId ?? g.runId
    if (!id || g.status !== 200 || !g.requestHash) continue
    if (!byRun.has(id)) byRun.set(id, [])
    byRun.get(id).push(g)
  }
  for (const v of byRun.values()) v.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0))
  const firstOf = (runId, pick) => (byRun.get(runId) ?? []).find(pick) ?? null
  const blocks = new Map()
  for (const r of runs) {
    if (r.arm !== NATIVE && r.arm !== TWIN) continue
    const k = r.task + '|' + r.seed
    const b = blocks.get(k) ?? { task: r.task, seed: r.seed }
    b[r.arm === NATIVE ? 'native' : 'twin'] = r.runId
    blocks.set(k, b)
  }
  const rows = []
  for (const b of blocks.values()) {
    if (!b.native || !b.twin) { rows.push({ ...b, main: 'missing-run', aux: 'missing-run' }); continue }
    const cmp = (pick) => {
      const x = firstOf(b.native, pick), y = firstOf(b.twin, pick)
      if (!x || !y) return { verdict: 'no-request' }
      return { verdict: x.requestHash === y.requestHash ? 'identical' : 'differs', bytes: [x.requestBytes, y.requestBytes] }
    }
    rows.push({ ...b, main: cmp((g) => !isAux(g)), aux: cmp(isAux) })
  }
  const count = (key, v) => rows.filter((r) => (r[key]?.verdict ?? r[key]) === v).length
  return {
    blocks: rows.length,
    mainIdentical: count('main', 'identical'), mainDiffers: count('main', 'differs'),
    auxIdentical: count('aux', 'identical'), auxDiffers: count('aux', 'differs'),
    incomplete: rows.filter((r) => r.main === 'missing-run' || r.main?.verdict === 'no-request').length,
    pass: rows.length > 0 && rows.every((r) => r.main?.verdict === 'identical'),
    rows,
  }
}

if (process.argv[1] && process.argv[1].endsWith('aa-identity.mjs')) {
  const argv = process.argv.slice(2)
  const runsPath = argv.includes('--runs') ? argv[argv.indexOf('--runs') + 1] : null
  if (!runsPath || !existsSync(runsPath)) { console.error('usage: node tools/aa-identity.mjs --runs <twin matrix runs.jsonl>'); process.exit(2) }
  const read = (p) => readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  const runs = read(runsPath)
  const ids = new Set(runs.map((r) => r.runId))
  const gw = discoverGateways().flatMap(read).filter((g) => ids.has(parseSyntheticKey(g.syntheticKey)?.runId ?? g.runId))
  const r = identityReport(runs, gw)
  console.log('blocks ' + r.blocks + ': main request identical in ' + r.mainIdentical + ', differs in ' + r.mainDiffers +
    '; auxiliary identical in ' + r.auxIdentical + ', differs in ' + r.auxDiffers + '; incomplete ' + r.incomplete)
  for (const x of r.rows.filter((x) => x.main?.verdict !== 'identical')) {
    console.log('  ' + x.task + ' s' + x.seed + ': main ' + (x.main?.verdict ?? x.main) + (x.main?.bytes ? ' (' + x.main.bytes.join(' vs ') + ' bytes)' : ''))
  }
  console.log(r.pass ? 'PASS: the copies sent identical bytes; the A/A is a control' : 'FAIL: STOP - do not run the full A/A')
  process.exit(r.pass ? 0 : 1)
}
