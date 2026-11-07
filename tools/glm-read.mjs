import { readFileSync, existsSync } from 'node:fs'
import { indexByRun } from './attribute.mjs'
import { PRICES } from './prices.mjs'

function load(logPath, runsPath) {
  const gw = []
  for (const l of readFileSync(logPath, 'utf8').split('\n')) { if (l.trim()) { try { gw.push(JSON.parse(l)) } catch {} } }
  const { byRun } = indexByRun(gw)
  const runs = []
  for (const l of readFileSync(runsPath, 'utf8').split('\n')) { if (l.trim()) { try { runs.push(JSON.parse(l)) } catch {} } }
  return { byRun, runs }
}
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

function summarise(label, logPath, runsPath) {
  if (!existsSync(runsPath)) return null
  const { byRun, runs } = load(logPath, runsPath)
  const arms = [...new Set(runs.map((r) => r.arm))]
  const out = {}
  for (const a of arms) {
    const rs = runs.filter((r) => r.arm === a)
    let cost = 0, steps = 0, hit = 0, miss = 0, outTok = 0, inTok = 0, solved = 0, n = 0
    for (const r of rs) {
      const reqs = byRun.get(r.runId) ?? []
      if (!reqs.length) continue
      n++
      if (r.solved) solved++
      steps += reqs.length
      for (const q of reqs) {
        const u = q.usage ?? {}
        hit += u.cacheHitTokens ?? 0; miss += u.cacheMissTokens ?? 0
        inTok += u.inputTokens ?? 0; outTok += u.outputTokens ?? 0
        cost += q.cost?.billedUsd ?? 0
      }
    }
    if (!n) continue
    out[a] = { cost: cost / n, steps: steps / n, hitRate: hit + miss > 0 ? hit / (hit + miss) : null, outPerStep: outTok / Math.max(1, steps), solved, n }
  }
  console.log('=== ' + label + '  (' + runs.length + ' runs) ===')
  console.log('  ' + 'arm'.padEnd(18) + 'cost/run'.padStart(10) + 'steps'.padStart(7) + 'cache'.padStart(8) + 'out/step'.padStart(10) + 'n'.padStart(4))
  for (const [a, x] of Object.entries(out)) {
    console.log('  ' + a.padEnd(18) + ('$' + x.cost.toFixed(5)).padStart(10) + x.steps.toFixed(1).padStart(7) +
      ((x.hitRate * 100).toFixed(1) + '%').padStart(8) + x.outPerStep.toFixed(0).padStart(10) + String(x.n).padStart(4))
  }
  return out
}

const glm = summarise('GLM-5.3-Flash  (in progress)', 'results/glm-gateway.jsonl', 'results/glm-flash/runs.jsonl')
console.log('')
const ds = summarise('DeepSeek V4.1 Flash  (for contrast, 15-task sweep)', 'results/gateway.jsonl', 'results/runs.jsonl')
console.log('')
if (glm && ds) {
  console.log('=== PTC vs native, per provider ===')
  for (const [name, x] of [['DeepSeek', ds], ['GLM-Flash', glm]]) {
    const p = x['dsh:ptc'], n = x['dsh:native']
    if (!p || !n) { console.log('  ' + name + ': incomplete'); continue }
    const diff = (p.cost - n.cost) / n.cost
    console.log('  ' + name.padEnd(12) + 'ptc $' + p.cost.toFixed(5) + '  native $' + n.cost.toFixed(5) +
      '   -> ' + (diff < 0 ? 'PTC cheaper by ' : 'NATIVE cheaper by ') + Math.abs(diff * 100).toFixed(1) + '%')
  }
  console.log('')
  console.log('=== output:input price ratio vs observed winner ===')
  const dsCard = PRICES['deepseek-flash']
  console.log('  DeepSeek  ratio ' + (dsCard.out / dsCard.miss).toFixed(2) + '  ->  ptc cheaper   (corrected 2026-09-30; was 2.00)')
  console.log('  GLM-Flash ratio ' + (PRICES['glm-5.3-flash'].out / PRICES['glm-5.3-flash'].miss).toFixed(2) + '  ->  see above')
  console.log('  NOTE: the $ figures above are the logs\' own cost.billedUsd; logs written before')
  console.log('        2026-09-30 17:43Z were priced with the retracted card.')
}
