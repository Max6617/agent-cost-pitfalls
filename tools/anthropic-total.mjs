import { readFileSync } from 'node:fs'
const CARD = {
  'claude-haiku-4-5':  { miss: 1.00, hit: 0.10, write: 1.25, out: 5.00 },
  'claude-sonnet-5-5': { miss: 2.00, hit: 0.20, write: 2.50, out: 10.00 },
}
const gw = readFileSync('results/anthropic-gateway.jsonl','utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean)
let total = 0, byModel = {}, n = {}, tokens = {}
for (const r of gw) {
  if (r.status !== 200 || !r.usage) continue
  const c = CARD[r.model]; if (!c) continue
  const u = r.usage
  const cost = ((u.cacheMissTokens??0)/1e6)*c.miss + ((u.cacheCreationTokens??0)/1e6)*c.write + ((u.cacheHitTokens??0)/1e6)*c.hit + ((u.outputTokens??0)/1e6)*c.out
  total += cost
  byModel[r.model] = (byModel[r.model] ?? 0) + cost
  n[r.model] = (n[r.model] ?? 0) + 1
  const t = tokens[r.model] = tokens[r.model] ?? { miss: 0, hit: 0, creat: 0, out: 0 }
  t.miss += u.cacheMissTokens ?? 0; t.hit += u.cacheHitTokens ?? 0; t.creat += u.cacheCreationTokens ?? 0; t.out += u.outputTokens ?? 0
}
console.log('=== OUR LOG, priced at the published cards ===')
for (const m of Object.keys(byModel)) {
  const t = tokens[m]
  console.log('  ' + m)
  console.log('    requests ' + n[m])
  console.log('    tokens   miss ' + t.miss.toLocaleString() + '  hit ' + t.hit.toLocaleString() + '  write ' + t.creat.toLocaleString() + '  out ' + t.out.toLocaleString())
  console.log('    cost     $' + byModel[m].toFixed(2))
}
console.log('')
console.log('  OUR TOTAL      : $' + total.toFixed(2))
console.log('  ANTHROPIC SAYS : $308.16')
console.log('  ratio          : ' + (308.16/total).toFixed(3) + 'x')