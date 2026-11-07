import { readFileSync, existsSync } from 'node:fs'
import { indexByRun } from './attribute.mjs'
import { PRICES } from './prices.mjs'
const CARD = PRICES['gpt-6-luna']   // from tools/prices.mjs
const gw = readFileSync('results/openai-gateway.jsonl','utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean)
const { byRun } = indexByRun(gw)
const runs = readFileSync('results/luna-full/runs.jsonl','utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean)
let cost = 0, n = 0, miss = 0, hit = 0, out = 0, solved = 0
for (const r of runs) {
  const q = byRun.get(r.runId) ?? []
  if (!q.length) continue
  n++; if (r.solved) solved++
  for (const x of q) {
    const u = x.usage ?? {}
    miss += u.cacheMissTokens ?? 0; hit += u.cacheHitTokens ?? 0; out += u.outputTokens ?? 0
    cost += ((u.cacheMissTokens??0)/1e6)*CARD.miss + ((u.cacheCreationTokens??0)/1e6)*CARD.write + ((u.cacheHitTokens??0)/1e6)*CARD.hit + ((u.outputTokens??0)/1e6)*CARD.out
  }
}
console.log('  luna runs billed : ' + n + '  (' + solved + ' solved)')
console.log('  spend            : $' + cost.toFixed(4))
console.log('  per run          : $' + (n ? (cost/n).toFixed(5) : '0'))
console.log('  tokens           : miss ' + miss.toLocaleString() + '  hit ' + hit.toLocaleString() + '  out ' + out.toLocaleString())
const per = n ? cost/n : 0
console.log('')
console.log('  PROJECTED to finish luna (620): $' + (per * (620 - runs.length)).toFixed(2))
console.log('')
// sol is 20x luna on both axes.
const solPer = per * 20
console.log('  sol at 20x luna = $' + solPer.toFixed(5) + '/run:')
console.log('    10 arms x 31 tasks x 2 seeds (620)  $' + (solPer * 620).toFixed(0))
console.log('    10 arms x 31 tasks x 1 seed  (310)  $' + (solPer * 310).toFixed(0))
console.log('    8 arms x 31 tasks x 1 seed   (248)  $' + (solPer * 248).toFixed(0))
console.log('    2 arms x 15 tasks x 1 seed   (30)   $' + (solPer * 30).toFixed(0))