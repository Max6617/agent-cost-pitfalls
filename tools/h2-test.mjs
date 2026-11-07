import { readFileSync, existsSync } from 'node:fs'
import { indexByRun } from './attribute.mjs'
import { PRICES } from './prices.mjs'
import { makeRng } from './rng.mjs'
const LOGS = ['results/glm-gateway.jsonl', 'results/glm53-gateway.jsonl']
const merged = new Map()
for (const f of LOGS) {
  if (!existsSync(f)) continue
  const gw = readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  const { byRun } = indexByRun(gw)
  for (const [k, v] of byRun) if (!merged.has(k)) merged.set(k, v)
}
const _glm = PRICES['glm-5.3-flash']
const CARD = { miss: _glm.miss, hit: _glm.hit, write: _glm.write ?? _glm.miss, out: _glm.out }
const isQuota = (r) => /QUOTA|Insufficient Balance/i.test((r.stderrTail ?? '') + (r.stdoutTail ?? ''))
function perTaskArm(runsP) {
  const runs = readFileSync(runsP, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const cell = {}
  for (const r of runs) {
    if (isQuota(r)) continue
    const reqs = merged.get(r.runId) ?? []
    if (!reqs.length) continue
    let c = 0
    for (const q of reqs) {
      const u = q.usage ?? {}
      const hit = u.cacheHitTokens ?? 0, miss = u.cacheMissTokens ?? 0
      const created = u.cacheCreationTokens ?? 0, out2 = u.outputTokens ?? 0
      // fresh = miss, NOT max(0, miss - created): the token buckets are disjoint.
      const fresh = miss
      c += (fresh / 1e6) * CARD.miss + (created / 1e6) * CARD.write + (hit / 1e6) * CARD.hit + (out2 / 1e6) * CARD.out
    }
    const k = r.task + '||' + r.arm
    ;(cell[k] = cell[k] ?? []).push(c)
  }
  const mean = {}
  for (const [k, v] of Object.entries(cell)) mean[k] = v.reduce((a, b) => a + b, 0) / v.length
  return mean
}
// REFUSE, DO NOT CRASH. results/glm-terse was destroyed on 2026-10-02 with the rest of results/
// (NEW-SESSION-BRIEF section 0), and the backup mirror is of results/, so it holds the same gap.
// An ENOENT stack trace reads like a broken tool; the truth is that this analysis cannot be
// recomputed at all, and its published numbers are unreproducible.
const NEEDED = ['results/glm-flash/runs.jsonl', 'results/glm-terse/runs.jsonl']
const missing = NEEDED.filter((f) => !existsSync(f))
if (missing.length) {
  console.error('H2 cannot be computed from this archive: missing ' + missing.join(', '))
  console.error('  The terse matrix went with results/ on 2026-10-02 and is not in git history or')
  console.error('  the backup mirror. H2 is one of the figures marked UNREPRODUCIBLE in')
  console.error('  notes/records/STEP2-RECONCILIATION.md; this tool is kept as the record of how it was computed.')
  process.exit(2)
}
const base = perTaskArm('results/glm-flash/runs.jsonl')
const terse = perTaskArm('results/glm-terse/runs.jsonl')
const tasks = [...new Set(Object.keys(base).map((k) => k.split('||')[0]))].sort()
const d = []
for (const t of tasks) {
  const pd = base[t + '||dsh:ptc'], pn = base[t + '||dsh:native']
  const td = terse[t + '||dsh:ptc-terse'], tn = terse[t + '||dsh:native-terse']
  if (pd == null || pn == null || td == null || tn == null) continue
  d.push({ task: t, def: pd - pn, ter: td - tn, delta: (td - tn) - (pd - pn) })
}
console.log('paired tasks with all four arms: ' + d.length)
const deltas = d.map((x) => x.delta)
const meanD = deltas.reduce((a, b) => a + b, 0) / deltas.length
const neg = deltas.filter((x) => x < 0).length
console.log('')
console.log('  mean(d) = $' + meanD.toFixed(6) + '   (H2 predicts < 0)')
console.log('  d < 0 in ' + neg + ' of ' + deltas.length + ' tasks')
console.log('')
// Exact one-sided sign test (the pre-registered test is Wilcoxon signed-rank; the sign
// test is reported alongside because with n this small it is the more honest bound.)
function binom(n, k) { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r }
let p = 0
for (let k = neg; k <= deltas.length; k++) p += binom(deltas.length, k) / Math.pow(2, deltas.length)
console.log('  exact one-sided sign test p = ' + p.toFixed(4))
console.log('')
// Bootstrap CI for mean(d)
let lo = null, hi = null
const B = 5000
const means = []
const rnd = makeRng(12345)   // tools/rng.mjs: why the LCG that used to be here is not usable
for (let b = 0; b < B; b++) {
  let s = 0
  for (let i = 0; i < deltas.length; i++) s += deltas[Math.floor(rnd() * deltas.length)]
  means.push(s / deltas.length)
}
means.sort((a, b) => a - b)
lo = means[Math.floor(B * 0.025)]; hi = means[Math.floor(B * 0.975)]
console.log('  bootstrap 95% CI for mean(d): [' + lo.toFixed(6) + ', ' + hi.toFixed(6) + ']')
console.log('  entirely below 0? ' + (hi < 0 ? 'YES' : 'NO'))
console.log('')
console.log('  PRE-REGISTERED DECISION (p<0.05 one-sided AND CI entirely below 0):')
const ok = p < 0.05 && hi < 0
console.log('    ' + (ok ? 'SUPPORTED' : 'NOT SUPPORTED on the pre-registered rule - d < 0 but the interval does not exclude 0'))