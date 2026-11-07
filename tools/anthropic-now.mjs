import { readFileSync, existsSync } from 'node:fs'
import { indexByRun } from './attribute.mjs'
const CARD = {
  'claude-haiku-4-5':  { miss: 1.00, hit: 0.10, write: 1.25, out: 5.00 },
  'claude-sonnet-5-5': { miss: 2.00, hit: 0.20, write: 2.50, out: 10.00 },
}
const gw = readFileSync('results/anthropic-gateway.jsonl','utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean)
const { byRun } = indexByRun(gw)
const isQuota = (r) => /credit balance is too low/i.test((r.stderrTail ?? '') + (r.stdoutTail ?? ''))

let totalSpend = 0
console.log('=== PROGRESS AND SPEND ===')
for (const pair of [['haiku', 'results/haiku-full/runs.jsonl', 'claude-haiku-4-5'], ['sonnet', 'results/sonnet-full/runs.jsonl', 'claude-sonnet-5-5']]) {
  const name = pair[0], p = pair[1], card = CARD[pair[2]]
  if (!existsSync(p)) { console.log(name + ': no runs'); continue }
  const runs = readFileSync(p,'utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean)
  let cost = 0, n = 0, quota = 0, miss = 0, hit = 0, creat = 0, out = 0
  for (const r of runs) {
    if (isQuota(r)) { quota++; continue }
    const q = byRun.get(r.runId) ?? []
    if (!q.length) continue
    n++
    for (const x of q) {
      const u = x.usage ?? {}
      miss += u.cacheMissTokens ?? 0; hit += u.cacheHitTokens ?? 0
      creat += u.cacheCreationTokens ?? 0; out += u.outputTokens ?? 0
      cost += ((u.cacheMissTokens??0)/1e6)*card.miss + ((u.cacheCreationTokens??0)/1e6)*card.write + ((u.cacheHitTokens??0)/1e6)*card.hit + ((u.outputTokens??0)/1e6)*card.out
    }
  }
  totalSpend += cost
  console.log('')
  console.log('  ' + name.toUpperCase())
  console.log('    runs recorded  : ' + runs.length + ' of 620   (' + quota + ' credit-failed)')
  console.log('    runs billed    : ' + n)
  console.log('    spend          : $' + cost.toFixed(2))
  console.log('    per run        : $' + (n ? (cost/n).toFixed(4) : '0'))
  console.log('    remaining      : ' + (620 - runs.length) + ' runs')
  console.log('    projected left : $' + (n ? (cost/n) * (620 - runs.length) : 0).toFixed(2))
}
console.log('')
console.log('  TOTAL measured this session: $' + totalSpend.toFixed(2))