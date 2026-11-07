import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { indexByRun } from './attribute.mjs'
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

function cost(gwPath, runsPath) {
  const gw = []
  for (const l of readFileSync(gwPath, 'utf8').split('\n')) { if (l.trim()) { try { gw.push(JSON.parse(l)) } catch {} } }
  const { byRun } = indexByRun(gw)
  const runs = readFileSync(runsPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const per = {}
  for (const r of runs) {
    const reqs = byRun.get(r.runId) ?? []
    if (!reqs.length) continue
    let c = 0
    for (const q of reqs) c += q.cost?.billedUsd ?? 0
    ;(per[r.arm] = per[r.arm] ?? []).push(c)
  }
  return { runs, meanCost: Object.fromEntries(Object.entries(per).map(([k, v]) => [k, mean(v)])) }
}

console.log('=== CLAIM 1: "DeepSeek 31 tasks x 5 arms x 2 seeds = 310 runs"')
const ds = cost('results/gateway.jsonl', 'results/runs.jsonl')
const dsTasks = new Set(ds.runs.map((r) => r.task))
console.log('  run records: ' + ds.runs.length + '   distinct tasks: ' + dsTasks.size)
const dsArms = new Set(ds.runs.map((r) => r.arm))
console.log('  arms: ' + dsArms.size + '   per-arm n: ' + [...dsArms].map((a) => ds.runs.filter((r) => r.arm === a).length).join('/'))
console.log('  joined to usage: ' + Object.values(ds.meanCost).length + ' arms')

console.log('')
console.log('=== CLAIM 2: "PTC 22.8% cheaper on DeepSeek"  [the old ratio 2.0 is RETRACTED; corrected card gives 4.00]')
const p = ds.meanCost['dsh:ptc'], n = ds.meanCost['dsh:native']
if (p && n) console.log('  ptc $' + p.toFixed(5) + '   native $' + n.toFixed(5) + '   -> ptc cheaper by ' + ((n - p) / n * 100).toFixed(1) + '%   [pre-reg says 22.8%]')

console.log('')
console.log('=== CLAIM 3: "advantage absent on GLM-5.3-Flash"')
const gf = cost('results/glm-gateway.jsonl', 'results/glm-flash/runs.jsonl')
const gp = gf.meanCost['dsh:ptc'], gn = gf.meanCost['dsh:native']
if (gp && gn) console.log('  ptc $' + gp.toFixed(5) + '   native $' + gn.toFixed(5) + '   -> ' + (gp < gn ? 'ptc cheaper by ' + ((gn - gp) / gn * 100).toFixed(1) + '%' : 'native cheaper by ' + ((gp - gn) / gp * 100).toFixed(1) + '%'))

console.log('')
console.log('=== CLAIM 4: "native 31.1% cheaper on GLM-5.3"')
const g5 = cost('results/glm53-gateway.jsonl', 'results/glm53/runs.jsonl')
const q5 = g5.meanCost['dsh:ptc'], n5 = g5.meanCost['dsh:native']
if (q5 && n5) console.log('  ptc $' + q5.toFixed(5) + '   native $' + n5.toFixed(5) + '   -> native cheaper by ' + ((q5 - n5) / n5 * 100).toFixed(1) + '%   [pre-reg says 31.1%]')
console.log('  GLM-5.3 solved: ' + g5.runs.filter((r) => r.solved).length + ' of ' + g5.runs.length)

console.log('')
console.log('=== CLAIM 5: "every GLM arm sits within 87-91%"')
for (const [name, gwP, runsP] of [['flash', 'results/glm-gateway.jsonl', 'results/glm-flash/runs.jsonl'], ['5.3', 'results/glm53-gateway.jsonl', 'results/glm53/runs.jsonl']]) {
  const gw = []
  for (const l of readFileSync(gwP, 'utf8').split('\n')) { if (l.trim()) { try { gw.push(JSON.parse(l)) } catch {} } }
  const { byRun } = indexByRun(gw)
  const runs = readFileSync(runsP, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const per = {}
  for (const r of runs) {
    for (const q of byRun.get(r.runId) ?? []) {
      const u = q.usage ?? {}
      per[r.arm] = per[r.arm] ?? { h: 0, m: 0 }
      per[r.arm].h += u.cacheHitTokens ?? 0; per[r.arm].m += u.cacheMissTokens ?? 0
    }
  }
  const rates = Object.values(per).map((x) => x.h / (x.h + x.m) * 100)
  console.log('  ' + name.padEnd(6) + 'range ' + Math.min(...rates).toFixed(1) + '-' + Math.max(...rates).toFixed(1) + '%')
}
