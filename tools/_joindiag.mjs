import { readFileSync, existsSync } from 'node:fs'
const d = 'results/check-fetch-heavy-semver-ranges/runs.jsonl'
const runs = readFileSync(d, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
console.log('runs: ' + runs.length)
console.log('sample runIds:')
for (const r of runs.slice(0, 3)) console.log('  ' + r.runId + '   exit=' + r.exitCode + '  solved=' + r.solved)
const gw = readFileSync('results/gateway.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
const ids = new Set(gw.map((r) => r.runId))
console.log('')
console.log('gateway runIds containing "semver":')
const s2 = [...ids].filter((i) => i && i.includes('semver'))
for (const i of s2.slice(0, 6)) console.log('  ' + i)
console.log('')
console.log('match check: ' + runs.filter((r) => ids.has(r.runId)).length + ' of ' + runs.length + ' runs found in the gateway log')
