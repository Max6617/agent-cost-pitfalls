import { readFileSync, existsSync } from 'node:fs'
// Injection added 2026-09-30 18:57:21 +0200 = 16:57:21 UTC.
const LIVE = '2026-09-30T16:57:21Z'
console.log('injection live from ' + LIVE)
console.log('')
for (const p of ['results/haiku-full/runs.jsonl', 'results/sonnet-full/runs.jsonl', 'results/pilot-anthropic/runs.jsonl']) {
  if (!existsSync(p)) continue
  const runs = readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  if (!runs.length) continue
  const first = runs[0].ts, last = runs[runs.length - 1].ts
  const during = runs.filter((r) => r.ts >= LIVE).length
  const before = runs.length - during
  console.log(p)
  console.log('  first run : ' + first)
  console.log('  last run  : ' + last)
  console.log('  total     : ' + runs.length)
  console.log('  WITH injection    : ' + during)
  console.log('  WITHOUT injection : ' + before)
}
console.log('')
console.log('=== and from Anthropic hourly export, share of tokens after injection ===')
const hours = [['16:00', 872364], ['17:00', 10818398], ['18:00', 41134322], ['19:00', 25205552], ['20:00', 56260410]]
const after = hours.filter((h) => h[0] !== '16:00').reduce((a, h) => a + h[1], 0)
const total = hours.reduce((a, h) => a + h[1], 0)
console.log('  uncached input before injection: ' + hours[0][1].toLocaleString())
console.log('  uncached input after  injection: ' + after.toLocaleString())
console.log('  -> ' + (after / total * 100).toFixed(1) + ' percent of Anthropic input was billed with the injection LIVE')