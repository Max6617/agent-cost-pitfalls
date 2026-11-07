import { readFileSync } from 'node:fs'
import { indexByRun } from './attribute.mjs'
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
function report(label, logPath, runsPath) {
  const gw = []
  for (const l of readFileSync(logPath, 'utf8').split('\n')) { if (l.trim()) { try { gw.push(JSON.parse(l)) } catch {} } }
  const { byRun } = indexByRun(gw)
  const runs = readFileSync(runsPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  console.log('=== ' + label + '  (' + runs.length + ' runs, ' + runs.filter((r) => r.solved).length + ' solved)')
  console.log('  ' + 'arm'.padEnd(18) + 'cost/run'.padStart(10) + 'steps'.padStart(7) + 'out/step'.padStart(10) + 'cache'.padStart(8) + 'solve'.padStart(7) + 'n'.padStart(4))
  const res = {}
  for (const a of [...new Set(runs.map((r) => r.arm))]) {
    const rs = runs.filter((r) => r.arm === a)
    let c = 0, st = 0, ot = 0, hit = 0, miss = 0, n = 0, sol = 0
    for (const r of rs) {
      const reqs = byRun.get(r.runId) ?? []
      if (!reqs.length) continue
      n++; if (r.solved) sol++
      st += reqs.length
      for (const q of reqs) {
        const u = q.usage ?? {}
        c += q.cost?.billedUsd ?? 0; ot += u.outputTokens ?? 0
        hit += u.cacheHitTokens ?? 0; miss += u.cacheMissTokens ?? 0
      }
    }
    if (!n) continue
    res[a] = { cost: c / n, steps: st / n, outPerStep: ot / st, hitRate: hit + miss > 0 ? hit / (hit + miss) : null, solve: sol / n, n }
    console.log('  ' + a.padEnd(18) + ('$' + res[a].cost.toFixed(5)).padStart(10) + res[a].steps.toFixed(1).padStart(7) +
      Math.round(res[a].outPerStep).toString().padStart(10) + ((res[a].hitRate * 100).toFixed(1) + '%').padStart(8) +
      (res[a].solve * 100).toFixed(0).padStart(6) + '%' + String(n).padStart(4))
  }
  return res
}
const g53 = report('GLM-5.3 (full model)', 'results/glm53-gateway.jsonl', 'results/glm53/runs.jsonl')
console.log('')
const gf = report('GLM-5.3-Flash', 'results/glm-gateway.jsonl', 'results/glm-flash/runs.jsonl')
console.log('')
if (g53['dsh:ptc'] && g53['dsh:native']) {
  const p = g53['dsh:ptc'].cost, nn = g53['dsh:native'].cost
  console.log('PTC vs native on GLM-5.3: ' + (p < nn ? 'PTC cheaper by ' : 'NATIVE cheaper by ') + (Math.abs(p - nn) / nn * 100).toFixed(1) + '%')
}
console.log('')
console.log('OUT/STEP, flash -> full:')
for (const a of Object.keys(g53)) if (gf[a]) console.log('  ' + a.padEnd(18) + Math.round(gf[a].outPerStep).toString().padStart(5) + ' -> ' + Math.round(g53[a].outPerStep).toString().padStart(5) + '  (' + (g53[a].outPerStep / gf[a].outPerStep).toFixed(2) + 'x)')
console.log('')
console.log('WHICH RUNS FAILED on GLM-5.3:')
const runs = readFileSync('results/glm53/runs.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
for (const r of runs.filter((x) => !x.solved)) console.log('  ' + r.arm.padEnd(18) + r.task)
