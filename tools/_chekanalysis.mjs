import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { cardFor } from './prices.mjs'

const gw = readFileSync('results/gateway.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
const byRun = new Map()
for (const r of gw) {
  if (!r.runId) continue
  if (!byRun.has(r.runId)) byRun.set(r.runId, [])
  byRun.get(r.runId).push(r)
}
// Card: tools/prices.mjs (single copy, corrected 2026-09-30).

const dirs = readdirSync('results').filter((d) => d.startsWith('check-') && d !== 'check-example-fix')
const rows = []
for (const d of dirs) {
  const f = join('results', d, 'runs.jsonl')
  if (!existsSync(f)) continue
  const runs = readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  if (runs.length < 10) continue
  const task = d.slice(6)
  const arms = [...new Set(runs.map((r) => r.arm))]
  const per = {}
  for (const a of arms) {
    const rs = runs.filter((r) => r.arm === a)
    let cost = 0, steps = 0, cacheHit = 0, cacheMiss = 0, solved = 0
    for (const r of rs) {
      if (r.solved) solved++
      const reqs = byRun.get(r.runId) ?? []
      steps += reqs.length
      for (const q of reqs) {
        const u = q.usage ?? {}
        const p = cardFor(q.model, { required: true })
        cacheHit += u.cacheHitTokens ?? 0
        cacheMiss += u.cacheMissTokens ?? 0
        cost += ((u.cacheMissTokens ?? 0) / 1e6) * p.miss + ((u.cacheHitTokens ?? 0) / 1e6) * p.hit + ((u.outputTokens ?? 0) / 1e6) * p.out
      }
    }
    per[a] = { solved, n: rs.length, cost: cost / rs.length, steps: steps / rs.length, hitRate: cacheHit + cacheMiss > 0 ? cacheHit / (cacheHit + cacheMiss) : null }
  }
  const costs = Object.values(per).map((x) => x.cost).filter((c) => c > 0)
  const spread = costs.length > 1 ? (Math.max(...costs) - Math.min(...costs)) / Math.max(...costs) : 0
  const rateSpread = Math.max(...Object.values(per).map((x) => x.solved / x.n)) - Math.min(...Object.values(per).map((x) => x.solved / x.n))
  const meanSteps = Object.values(per).reduce((a, x) => a + x.steps, 0) / Object.values(per).length
  const ptc = ['dsh:ptc', 'dsh:ptc-opt'].map((a) => per[a]?.hitRate).filter((x) => x != null)
  const nat = ['dsh:native', 'dsh:native-opt', 'opencode'].map((a) => per[a]?.hitRate).filter((x) => x != null)
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length
  rows.push({ task, spread, rateSpread, meanSteps, cacheGap: ptc.length && nat.length ? avg(ptc) - avg(nat) : null })
}

rows.sort((a, b) => b.spread - a.spread)
console.log(rows.length + ' tasks with complete data')
console.log('')
console.log('  ' + 'task'.padEnd(36) + 'cost spr'.padStart(9) + 'mean steps'.padStart(11) + 'cache gap'.padStart(11))
for (const r of rows) {
  console.log('  ' + r.task.padEnd(36) + ((r.spread * 100).toFixed(0) + '%').padStart(9) + r.meanSteps.toFixed(1).padStart(11) +
    (r.cacheGap == null ? 'n/a' : ((r.cacheGap * 100).toFixed(1) + 'pp')).padStart(11))
}
const spreads = rows.map((r) => r.spread)
const gaps = rows.map((r) => r.cacheGap).filter((g) => g != null)
console.log('')
console.log('cost spread      : min ' + (Math.min(...spreads) * 100).toFixed(0) + '%  median ' + (spreads.sort((a, b) => a - b)[Math.floor(spreads.length / 2)] * 100).toFixed(0) + '%  max ' + (Math.max(...spreads) * 100).toFixed(0) + '%')
console.log('tasks discriminating on SOLVE RATE: ' + rows.filter((r) => r.rateSpread > 0).length + ' of ' + rows.length)
console.log('mean steps across arms: ' + (rows.reduce((a, r) => a + r.meanSteps, 0) / rows.length).toFixed(1))
console.log('PTC cache advantage: median ' + (gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] * 100).toFixed(1) + 'pp   positive in ' + gaps.filter((g) => g > 0).length + '/' + gaps.length)
