import { readFileSync, existsSync } from 'node:fs'
import { cardFor } from './prices.mjs'
const dir = process.argv[2] ?? 'results'
const runs = readFileSync(dir + '/runs.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const usage = readFileSync(dir + '/gateway.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const byRun = new Map()
for (const u of usage) { if (!u.usage || !u.runId) continue; if (!byRun.has(u.runId)) byRun.set(u.runId, []); byRun.get(u.runId).push(u) }
// Cards: tools/prices.mjs (single copy, corrected 2026-09-30).
function metrics(run) {
  const reqs = byRun.get(run.runId) ?? []
  const pr = cardFor(reqs.find((r) => r.model)?.model, { required: true })
  let cold = 0, billed = 0, hit = 0, miss = 0, inn = 0, out = 0
  for (const r of reqs) {
    const u = r.usage ?? {}
    const i = u.inputTokens ?? 0, h = u.cacheHitTokens ?? 0, m = u.cacheMissTokens ?? Math.max(0, i - h)
    inn += i; out += u.outputTokens ?? 0; hit += h; miss += Math.max(0, m)
    cold += (i / 1e6) * pr.miss + ((u.outputTokens ?? 0) / 1e6) * pr.out
    billed += (Math.max(0, m) / 1e6) * pr.miss + (h / 1e6) * pr.hit + ((u.outputTokens ?? 0) / 1e6) * pr.out
  }
  return { cold, billed, hitRate: hit + miss > 0 ? hit / (hit + miss) : null, inn, out, steps: reqs.length }
}
for (const r of runs) Object.assign(r, metrics(r))
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length
const sd = (a) => { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)) }
const arms = [...new Set(runs.map((r) => r.arm))]
console.log('VARIANCE with ' + runs.filter((r) => r.arm === arms[0]).length + ' seeds per arm')
console.log('')
console.log('  ' + 'arm'.padEnd(18) + 'n'.padStart(3) + 'billed mean'.padStart(13) + 'sd'.padStart(10) + 'cv'.padStart(8) + 'cacheHit'.padStart(10) + 'steps'.padStart(7))
const cvs = []
for (const a of arms) {
  const rs = runs.filter((r) => r.arm === a)
  const b = rs.map((r) => r.billed), h = rs.map((r) => r.hitRate).filter((v) => v != null), st = rs.map((r) => r.steps)
  const m = mean(b), d = sd(b)
  if (!Number.isNaN(d) && m > 0) cvs.push(d / m)
  console.log('  ' + a.padEnd(18) + String(rs.length).padStart(3) + ('$' + m.toFixed(5)).padStart(13) +
    ('$' + (Number.isNaN(d) ? 0 : d).toFixed(5)).padStart(10) + ((Number.isNaN(d) ? 0 : (d / m) * 100).toFixed(1) + '%').padStart(8) +
    ((mean(h) * 100).toFixed(1) + '%').padStart(10) + mean(st).toFixed(1).padStart(7))
}
const cv = mean(cvs)
console.log('')
console.log('  typical within-cell CV: ' + (cv * 100).toFixed(1) + '%   (was 21.9% at n=2)')
console.log('')
const z = 7.85
console.log('REQUIRED TASK BLOCKS for 80% power (paired, alpha=0.05)')
console.log('  ' + 'effect'.padEnd(12) + 'rho=0.0'.padStart(9) + 'rho=0.5'.padStart(9) + 'rho=0.7'.padStart(9) + 'rho=0.8'.padStart(9))
for (const eff of [0.05, 0.10, 0.15, 0.20, 0.30]) {
  const row = [0, 0.5, 0.7, 0.8].map((rho) => { const s2 = cv * Math.sqrt(2 * (1 - rho)); return Math.ceil(z * s2 * s2 / (eff * eff)) })
  console.log('  ' + ((eff * 100).toFixed(0) + '%').padEnd(12) + row.map((v) => String(Math.min(v, 9999)).padStart(9)).join(''))
}
