/**
 * mechanism — where does the cost spread between arms actually come from?
 *
 * Billed cost decomposes into factors a harness can influence:
 *
 *   cost = steps x [ inputPerStep x (hitRate x hitPrice + (1-hitRate) x missPrice)
 *                  + outputPerStep x outPrice ]
 *
 * so a spread can come from STEPS, from TOKENS PER STEP, from CACHE, or from
 * OUTPUT. This measures each factor per arm across every task that has complete
 * data, then reports which one moves with cost.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { indexByRun } from './attribute.mjs'
import { PRICES } from './prices.mjs'

// INPUTS DESTROYED - this tool cannot run and is kept as the record of a question that was
// answered on data which no longer exists. results/gateway.jsonl and the results/check-* matrices
// went with the rest of results/ on 2026-10-02, and the backup mirror holds the same gap.
// Its finding ("cache is not the driver" of the arm spread) survives as its commit message and is
// superseded by tools/prefix-retention.mjs, which runs on the six surviving matrices and reports
// where the prefix effect DOES operate.
if (!existsSync('results/gateway.jsonl')) {
  console.error('mechanism.mjs cannot run: results/gateway.jsonl was destroyed on 2026-10-02.')
  console.error('  Its matrices (results/check-*) went with it. Use tools/prefix-retention.mjs,')
  console.error('  which measures the same question on the six surviving matrices.')
  process.exit(2)
}

const P = PRICES['deepseek-flash']   // corrected card, see tools/prices.mjs
const gw = []
for (const l of readFileSync('results/gateway.jsonl', 'utf8').split('\n')) {
  if (!l.trim()) continue
  try { gw.push(JSON.parse(l)) } catch {}
}
const { byRun } = indexByRun(gw)

const dirs = readdirSync('results').filter((d) => d.startsWith('check-') && d !== 'check-example-fix')
const obs = []
for (const d of dirs) {
  const f = join('results', d, 'runs.jsonl')
  if (!existsSync(f)) continue
  const runs = []
  for (const l of readFileSync(f, 'utf8').split('\n')) { if (l.trim()) { try { runs.push(JSON.parse(l)) } catch {} } }
  if (runs.length < 10) continue
  for (const r of runs) {
    const reqs = byRun.get(r.runId) ?? []
    if (!reqs.length) continue
    let hit = 0, miss = 0, out = 0, cost = 0
    for (const q of reqs) {
      const u = q.usage ?? {}
      hit += u.cacheHitTokens ?? 0; miss += u.cacheMissTokens ?? 0; out += u.outputTokens ?? 0
      cost += ((u.cacheMissTokens ?? 0) / 1e6) * P.miss + ((u.cacheHitTokens ?? 0) / 1e6) * P.hit + ((u.outputTokens ?? 0) / 1e6) * P.out
    }
    obs.push({ task: d.slice(6), arm: r.arm, solved: r.solved, steps: reqs.length, hit, miss, out, cost,
      inTok: hit + miss, hitRate: hit + miss > 0 ? hit / (hit + miss) : null })
  }
}
console.log('observations: ' + obs.length + '   tasks: ' + new Set(obs.map((o) => o.task)).size + '   arms: ' + new Set(obs.map((o) => o.arm)).size)
const arms = [...new Set(obs.map((o) => o.arm))]
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

console.log('')
console.log('PER ARM (mean per run)')
console.log('  ' + 'arm'.padEnd(18) + 'cost'.padStart(10) + 'steps'.padStart(7) + 'in/step'.padStart(9) + 'out/step'.padStart(9) + 'cacheHit'.padStart(10) + 'solve'.padStart(7))
const agg = {}
for (const a of arms) {
  const rs = obs.filter((o) => o.arm === a)
  const steps = mean(rs.map((r) => r.steps))
  agg[a] = {
    cost: mean(rs.map((r) => r.cost)), steps,
    inPerStep: mean(rs.map((r) => r.inTok / Math.max(1, r.steps))),
    outPerStep: mean(rs.map((r) => r.out / Math.max(1, r.steps))),
    hit: mean(rs.map((r) => r.hitRate ?? 0)),
    solve: mean(rs.map((r) => (r.solved ? 1 : 0))),
  }
  const x = agg[a]
  console.log('  ' + a.padEnd(18) + ('$' + x.cost.toFixed(5)).padStart(10) + x.steps.toFixed(1).padStart(7) +
    x.inPerStep.toFixed(0).padStart(9) + x.outPerStep.toFixed(0).padStart(9) + (x.hit * 100).toFixed(1).padStart(9) + '%' + (x.solve * 100).toFixed(0).padStart(6) + '%')
}

// Which factor correlates with cost ACROSS ARMS?
console.log('')
console.log('WHICH FACTOR MOVES WITH COST (across the ' + arms.length + ' arm means)')
function corr(xs, ys) {
  const mx = mean(xs), my = mean(ys)
  let n = 0, dx = 0, dy = 0
  for (let i = 0; i < xs.length; i++) { n += (xs[i] - mx) * (ys[i] - my); dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2 }
  return dx && dy ? n / Math.sqrt(dx * dy) : 0
}
const costs = arms.map((a) => agg[a].cost)
for (const [label, key, fmt] of [['steps', 'steps', (v) => v.toFixed(1)], ['input tokens per step', 'inPerStep', (v) => v.toFixed(0)], ['output tokens per step', 'outPerStep', (v) => v.toFixed(0)], ['cache hit rate', 'hit', (v) => (v * 100).toFixed(1) + '%']]) {
  const xs = arms.map((a) => agg[a][key])
  console.log('  ' + label.padEnd(24) + 'r = ' + corr(xs, costs).toFixed(3).padStart(7) + '   range ' + fmt(Math.min(...xs)) + ' .. ' + fmt(Math.max(...xs)))
}

// Decompose the spread: how much would cost change if each factor alone were equalised?
console.log('')
console.log('COUNTERFACTUAL: equalise one factor across arms, keep the rest, see the spread')
const base = (() => { const c = arms.map((a) => agg[a].cost); return (Math.max(...c) - Math.min(...c)) / Math.max(...c) })()
console.log('  measured spread              : ' + (base * 100).toFixed(1) + '%')
const effPrice = (hit) => hit * P.hit + (1 - hit) * P.miss
for (const key of ['steps', 'inPerStep', 'outPerStep', 'hit']) {
  const m = mean(arms.map((a) => agg[a][key]))
  const c = arms.map((a) => {
    const x = { ...agg[a] }
    x[key] = m
    return x.steps * (x.inPerStep * effPrice(x.hit) + x.outPerStep * P.out) / 1e6
  })
  const sp = (Math.max(...c) - Math.min(...c)) / Math.max(...c)
  console.log('  equalise ' + key.padEnd(22) + ': ' + (sp * 100).toFixed(1) + '%   (' + ((base - sp) / base * 100).toFixed(0) + '% of the spread removed)')
}
