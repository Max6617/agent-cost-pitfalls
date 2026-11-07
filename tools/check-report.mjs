import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { PRICES } from './prices.mjs'

const gwRaw = readFileSync('results/gateway.jsonl', 'utf8')
const gw = []
for (const l of gwRaw.split('\n')) {
  if (!l.trim()) continue
  try { gw.push(JSON.parse(l)) } catch {}
}
console.log('gateway records parsed: ' + gw.length)
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
    per[a] = { solved, n: rs.length, cost: cost / rs.length, steps: steps / rs.length, hitRate: hit + miss > 0 ? hit / (hit + miss) : null }
  }
  const cs = Object.values(per).map((x) => x.cost).filter((c) => c > 0)
  const spread = cs.length > 1 ? (Math.max(...cs) - Math.min(...cs)) / Math.max(...cs) : 0
  const steps = Object.values(per).reduce((a, x) => a + x.steps, 0) / Object.values(per).length
  const ptc = ['dsh:ptc', 'dsh:ptc-opt'].map((a) => per[a]?.hitRate).filter((x) => x != null)
  const nat = ['dsh:native', 'dsh:native-opt', 'opencode'].map((a) => per[a]?.hitRate).filter((x) => x != null)
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length
  rows.push({ t: d.slice(6), spread, steps, gap: ptc.length && nat.length ? (avg(ptc) - avg(nat)) * 100 : null })
}
rows.sort((a, b) => b.spread - a.spread)
console.log(rows.length + ' tasks')
console.log('  ' + 'task'.padEnd(36) + 'cost spr'.padStart(9) + 'steps'.padStart(8) + 'PTC gap'.padStart(10))
for (const r of rows) console.log('  ' + r.t.padEnd(36) + ((r.spread * 100).toFixed(0) + '%').padStart(9) + r.steps.toFixed(1).padStart(8) + (r.gap == null ? 'n/a' : (r.gap.toFixed(1) + 'pp')).padStart(10))
const sp = rows.map((r) => r.spread).sort((a, b) => a - b)
const gp = rows.map((r) => r.gap).filter((g) => g != null).sort((a, b) => a - b)
console.log('')
console.log('cost spread  : median ' + (sp[Math.floor(sp.length / 2)] * 100).toFixed(0) + '%   min ' + (sp[0] * 100).toFixed(0) + '%   max ' + (sp[sp.length - 1] * 100).toFixed(0) + '%')
console.log('mean steps   : ' + (rows.reduce((a, r) => a + r.steps, 0) / rows.length).toFixed(1))
console.log('PTC gap      : median ' + gp[Math.floor(gp.length / 2)].toFixed(1) + 'pp   positive in ' + gp.filter((g) => g > 0).length + '/' + gp.length)
