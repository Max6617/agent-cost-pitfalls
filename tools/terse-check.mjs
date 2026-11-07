import { readFileSync, existsSync } from 'node:fs'
import { indexByRun } from './attribute.mjs'
// The baseline glm-5.3-flash runs and the terseness runs landed in DIFFERENT gateway
// logs, because the gateway was restarted between them and each instance logs where it
// was started. Searching one log finds half the arms and reports the rest missing.
const LOGS = ['results/glm-gateway.jsonl', 'results/glm53-gateway.jsonl']
const merged = new Map()
for (const f of LOGS) {
  if (!existsSync(f)) continue
  const gw = readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  const { byRun } = indexByRun(gw)
  for (const [k, v] of byRun) { if (!merged.has(k)) merged.set(k, v) }
}
console.log('merged gateway records for ' + merged.size + ' runs from ' + LOGS.length + ' logs')
console.log('')
function stats(runsP, model) {
  if (!existsSync(runsP)) return {}
  const runs = readFileSync(runsP, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  const acc = {}
  for (const r of runs) {
    if (model && r.model && r.model !== model) continue
    const reqs = merged.get(r.runId) ?? []
    if (!reqs.length) continue
    const a = acc[r.arm] = acc[r.arm] ?? { n: 0, solved: 0, out: 0, reqs: 0 }
    a.n++; if (r.solved) a.solved++; a.reqs += reqs.length
    for (const q of reqs) a.out += (q.usage ?? {}).outputTokens ?? 0
  }
  return acc
}
const base = stats('results/glm-flash/runs.jsonl')
const terse = stats('results/glm-terse/runs.jsonl')
console.log('GLM-5.3-Flash')
console.log('  ' + 'arm'.padEnd(24) + 'n'.padStart(4) + 'solved'.padStart(8) + 'out/run'.padStart(10) + 'reqs'.padStart(6))
for (const [label, src] of [['DEFAULT', base], ['TERSE', terse]]) {
  for (const k of Object.keys(src).sort()) {
    const a = src[k]
    console.log('  ' + (label + ' ' + k).padEnd(24) + String(a.n).padStart(4) + (a.solved + '/' + a.n).padStart(8) + String(Math.round(a.out / a.n)).padStart(10) + String(a.reqs).padStart(6))
  }
}
console.log('')
console.log('*** DOES THE TERSE INSTRUCTION REDUCE OUTPUT? ***')
for (const [a, b, name] of [['dsh:native', 'dsh:native-terse', 'native'], ['dsh:ptc', 'dsh:ptc-terse', 'ptc']]) {
  const x = base?.[a], y = terse?.[b]
  if (!x || !y) { console.log('  ' + name + ': missing'); continue }
  const xo = x.out / x.n, yo = y.out / y.n
  const d = (yo - xo) / xo * 100
  console.log('  ' + name.padEnd(8) + 'default ' + Math.round(xo) + '/run -> terse ' + Math.round(yo) + '/run   ' + (d < 0 ? 'REDUCED ' + (-d).toFixed(1) + '%' : 'INCREASED ' + d.toFixed(1) + '%'))
}