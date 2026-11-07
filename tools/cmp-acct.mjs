import { readFileSync } from 'node:fs'
const gw = readFileSync('results/anthropic-gateway.jsonl','utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean)
const ok = gw.filter(r => r.status === 200 && r.usage)
const CUT = '2026-09-30T20:28:00Z'
const before = ok.filter(r => r.ts < CUT)
const after = ok.filter(r => r.ts >= CUT)
function avg(rows, f) { if (!rows.length) return 0; return rows.reduce((a,r)=>a+(f(r.usage)||0),0)/rows.length }
console.log('  requests before: ' + before.length + '   after restart: ' + after.length)
console.log('')
console.log('  ' + 'field'.padEnd(24) + 'before'.padStart(11) + 'after'.padStart(11))
for (const pair of [['inputTokens', u=>u.inputTokens], ['cacheHitTokens', u=>u.cacheHitTokens], ['cacheMissTokens', u=>u.cacheMissTokens], ['cacheCreationTokens', u=>u.cacheCreationTokens], ['outputTokens', u=>u.outputTokens]]) {
  const b = avg(before, pair[1]), a = avg(after, pair[1])
  console.log('  ' + pair[0].padEnd(24) + Math.round(b).toLocaleString().padStart(11) + Math.round(a).toLocaleString().padStart(11))
}
if (after.length > 3) {
  const b = avg(before, u=>u.cacheCreationTokens), a = avg(after, u=>u.cacheCreationTokens)
  console.log('')
  console.log(b > 0 && a > b * 2 ? '  THE MERGE WAS DROPPING CREATIONS' : '  creations unchanged - the gap is NOT the merge')
} else { console.log(''); console.log('  too few requests after the restart to compare yet') }