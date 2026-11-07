import { readFileSync, existsSync } from 'node:fs'
import { indexByRun } from './attribute.mjs'
// The cards the gateway SHOULD have used. Aliases resolved.
const CARD = {
  'claude-haiku-4-5':  { miss: 1.00, hit: 0.10, write: 1.25, out: 5.00, canon: 'haiku' },
  'claude-sonnet-5-5': { miss: 2.00, hit: 0.20, write: 2.50, out: 10.00, canon: 'sonnet' },
}
const gw = readFileSync('results/anthropic-gateway.jsonl','utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean)
const { byRun } = indexByRun(gw)
let real = 0
const perModel = {}
for (const r of gw) {
  if (r.status !== 200 || !r.usage) continue
  const c = CARD[r.model] ?? CARD['claude-haiku-4-5']
  const u = r.usage
  const cost = ((u.cacheMissTokens??0)/1e6)*c.miss + ((u.cacheHitTokens??0)/1e6)*c.hit + ((u.outputTokens??0)/1e6)*c.out
  real += cost
  perModel[c.canon] = (perModel[c.canon] ?? 0) + cost
}
console.log('=== REAL Anthropic spend, all traffic in the log ===')
for (const [k,v] of Object.entries(perModel)) console.log('  ' + k.padEnd(10) + '$' + v.toFixed(2))
console.log('  ' + 'TOTAL'.padEnd(10) + '$' + real.toFixed(2))
console.log('')
console.log('  what the gateway reported : $18.13')
console.log('  under-reporting factor    : ' + (real/18.13).toFixed(1) + 'x')
console.log('')
// Now project the remaining runs, per matrix, at the real per-run cost.
const M = { haiku: 'results/haiku-full/runs.jsonl', sonnet: 'results/sonnet-full/runs.jsonl' }
const PER = { haiku: 1.00, sonnet: 2.00 }
let totalLeft = 0
for (const [name, p] of Object.entries(M)) {
  const runs = readFileSync(p,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l))
  let cost = 0, n = 0
  for (const r of runs) {
    if (/credit balance is too low/i.test((r.stderrTail??'')+(r.stdoutTail??''))) continue
    const q = byRun.get(r.runId) ?? []
    if (!q.length) continue
    n++
    for (const x of q) { const u = x.usage??{}; cost += ((u.cacheMissTokens??0)/1e6)*PER[name] + ((u.cacheHitTokens??0)/1e6)*PER[name]*0.1 + ((u.outputTokens??0)/1e6)*PER[name]*5 }
  }
  const per = n ? cost/n : 0
  const left = 620 - runs.length
  totalLeft += per * left
  console.log('  ' + name.padEnd(8) + 'measured $' + cost.toFixed(2) + ' over ' + n + ' runs = $' + per.toFixed(4) + '/run')
  console.log('  ' + ''.padEnd(8) + left + ' runs remaining -> $' + (per*left).toFixed(2))
}
console.log('')
console.log('  TO FINISH BOTH MATRICES: $' + totalLeft.toFixed(2))