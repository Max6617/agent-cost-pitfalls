import { readFileSync, existsSync } from 'node:fs'
import { indexByRun } from './attribute.mjs'
// Each provider's cache behaviour, measured over its COMPLETE dataset where one exists.
const SETS = [
  ['DeepSeek V4.1 Flash', 'results/gateway.jsonl', 'results/ds-full/runs.jsonl'],
  ['GLM-5.3-Flash', 'results/glm-gateway.jsonl', 'results/glm-flash/runs.jsonl'],
  ['Qwen3.8-Flash', 'results/qwen-gateway.jsonl', 'results/qwen-full/runs.jsonl'],
  ['Claude Haiku 4.5', 'results/anthropic-gateway.jsonl', 'results/haiku-full/runs.jsonl'],
  ['Claude Sonnet 5.5', 'results/anthropic-gateway.jsonl', 'results/sonnet-full/runs.jsonl'],
  ['gpt-6-luna', 'results/openai-gateway.jsonl', 'results/luna-smoke/runs.jsonl'],
]
console.log('  ' + 'provider'.padEnd(22) + 'runs'.padStart(6) + 'cache-hit'.padStart(11) + 'cache-read'.padStart(12) + 'uncached'.padStart(12) + '  ACTIVATION')
for (const s of SETS) {
  const gwP = s[1], runsP = s[2]
  if (!existsSync(gwP) || !existsSync(runsP)) { console.log('  ' + s[0].padEnd(22) + '(no data)'); continue }
  const gw = readFileSync(gwP, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  const { byRun } = indexByRun(gw)
  const runs = readFileSync(runsP, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  let hit = 0, miss = 0, n = 0
  for (const r of runs) {
    const q = byRun.get(r.runId) ?? []
    if (!q.length) continue
    n++
    for (const x of q) { const u = x.usage ?? {}; hit += u.cacheHitTokens ?? 0; miss += u.cacheMissTokens ?? 0 }
  }
  if (!n || hit + miss === 0) { console.log('  ' + s[0].padEnd(22) + '(no usage)'); continue }
  const rate = hit / (hit + miss) * 100
  const act = rate > 60 ? 'AUTOMATIC' : rate > 20 ? 'partial' : 'NONE - needs explicit cache_control'
  console.log('  ' + s[0].padEnd(22) + String(n).padStart(6) + (rate.toFixed(1) + '%').padStart(11) + (hit/1e6).toFixed(1).padStart(11) + 'M' + (miss/1e6).toFixed(1).padStart(11) + 'M' + '  ' + act)
}