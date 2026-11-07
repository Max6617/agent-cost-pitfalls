/**
 * re-attribute — recompute harness and runId from the RAW synthetic key.
 *
 * The gateway's attribute() split keys with a regex that took the shortest harness
 * for which the next segment began with "r", so any run id containing an r-initial
 * segment was filed under a harness nothing queried. Those records are still in the
 * log with their original syntheticKey intact, so the correct attribution is
 * recoverable offline - no re-running, no extra spend.
 *
 * The harness is simply the first segment after "exp-"; the runId is everything after.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { PRICES } from './prices.mjs'

function reattribute(syntheticKey, fallbackHarness, fallbackRunId) {
  const raw = String(syntheticKey ?? '')
  if (!raw.startsWith('exp-')) return { harness: fallbackHarness, runId: fallbackRunId }
  const parts = raw.slice(4).split('-')
  return { harness: parts[0] || 'unknown', runId: parts.slice(1).join('-') || 'unset' }
}

const gw = []
for (const l of readFileSync('results/gateway.jsonl', 'utf8').split('\n')) {
  if (!l.trim()) continue
  try { gw.push(JSON.parse(l)) } catch {}
}
let fixed = 0
for (const r of gw) {
  if (!r.syntheticKey) continue
  const a = reattribute(r.syntheticKey, r.harness, r.runId)
  if (a.harness !== r.harness || a.runId !== r.runId) fixed++
  r.harness = a.harness
  r.runId = a.runId
}
console.log('gateway records: ' + gw.length + '   re-attributed: ' + fixed)

const byRun = new Map()
for (const r of gw) {
  if (!r.runId) continue
  if (!byRun.has(r.runId)) byRun.set(r.runId, [])
  byRun.get(r.runId).push(r)
}
const P = PRICES['deepseek-flash']   // corrected card, see tools/prices.mjs

const dirs = readdirSync('results').filter((d) => d.startsWith('check-') && d !== 'check-example-fix')
const rows = []
for (const d of dirs) {
  const f = join('results', d, 'runs.jsonl')
  if (!existsSync(f)) continue
  const runs = []
  for (const l of readFileSync(f, 'utf8').split('\n')) { if (l.trim()) { try { runs.push(JSON.parse(l)) } catch {} } }
  if (runs.length < 10) continue
  const per = {}
  for (const a of [...new Set(runs.map((r) => r.arm))]) {
    const rs = runs.filter((r) => r.arm === a)
    let cost = 0, steps = 0, hit = 0, miss = 0, solved = 0
    for (const r of rs) {
      if (r.solved) solved++
      const reqs = byRun.get(r.runId) ?? []
      steps += reqs.length
      for (const q of reqs) {
        const u = q.usage ?? {}
        hit += u.cacheHitTokens ?? 0; miss += u.cacheMissTokens ?? 0
        cost += ((u.cacheMissTokens ?? 0) / 1e6) * P.miss + ((u.cacheHitTokens ?? 0) / 1e6) * P.hit + ((u.outputTokens ?? 0) / 1e6) * P.out
      }
    }
    per[a] = { solved, n: rs.length, cost: cost / rs.length, steps: steps / rs.length, hitRate: hit + miss > 0 ? hit / (hit + miss) : null, hit, miss }
  }
  const cs = Object.values(per).map((x) => x.cost).filter((c) => c > 0)
  const spread = cs.length > 1 ? (Math.max(...cs) - Math.min(...cs)) / Math.max(...cs) : 0
  const steps = Object.values(per).reduce((a, x) => a + x.steps, 0) / Object.values(per).length
  const ptc = ['dsh:ptc', 'dsh:ptc-opt'].map((a) => per[a]).filter((x) => x && x.hit + x.miss > 0)
  const nat = ['dsh:native', 'dsh:native-opt', 'opencode'].map((a) => per[a]).filter((x) => x && x.hit + x.miss > 0)
  const H = (a) => a.reduce((s2, x) => s2 + x.hit, 0) / a.reduce((s2, x) => s2 + x.hit + x.miss, 0)
  rows.push({ t: d.slice(6), spread, steps, ptcRate: ptc.length ? H(ptc) : null, natRate: nat.length ? H(nat) : null })
}
rows.sort((a, b) => (b.ptcRate ?? 0) - (b.natRate ?? 0) - ((a.ptcRate ?? 0) - (a.natRate ?? 0)))
console.log('')
console.log('  ' + 'task'.padEnd(34) + 'cost spr'.padStart(9) + 'steps'.padStart(7) + 'PTC'.padStart(8) + 'native'.padStart(8) + 'gap'.padStart(8))
for (const r of rows) {
  const gap = r.ptcRate != null && r.natRate != null ? (r.ptcRate - r.natRate) * 100 : null
  console.log('  ' + r.t.padEnd(34) + ((r.spread * 100).toFixed(0) + '%').padStart(9) + r.steps.toFixed(1).padStart(7) +
    (r.ptcRate == null ? 'n/a' : (r.ptcRate * 100).toFixed(1) + '%').padStart(8) +
    (r.natRate == null ? 'n/a' : (r.natRate * 100).toFixed(1) + '%').padStart(8) +
    (gap == null ? 'n/a' : (gap.toFixed(1) + 'pp')).padStart(8))
}
const gaps = rows.map((r) => (r.ptcRate != null && r.natRate != null ? (r.ptcRate - r.natRate) * 100 : null)).filter((g) => g != null).sort((a, b) => a - b)
const spreads = rows.map((r) => r.spread).sort((a, b) => a - b)
console.log('')
console.log('tasks measured      : ' + rows.length)
console.log('cost spread         : median ' + (spreads[Math.floor(spreads.length / 2)] * 100).toFixed(0) + '%   range ' + (spreads[0] * 100).toFixed(0) + '-' + (spreads[spreads.length - 1] * 100).toFixed(0) + '%')
console.log('PTC cache advantage : median ' + gaps[Math.floor(gaps.length / 2)].toFixed(1) + 'pp   positive in ' + gaps.filter((g) => g > 0).length + '/' + gaps.length)
console.log('mean steps          : ' + (rows.reduce((a, r) => a + r.steps, 0) / rows.length).toFixed(1))
