/**
 * power-real — are 30 tasks enough? Answer with the OBSERVED between-task
 * variance, which the earlier power analysis could not estimate because it had
 * a single task.
 *
 * The unit of analysis is the per-task difference between two arms. Its variance
 * has two parts: within-task (seed noise) and between-task (task heterogeneity).
 * Task heterogeneity is normally the larger term and is what determines how many
 * tasks the study needs.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { indexByRun } from './attribute.mjs'
import { PRICES } from './prices.mjs'

const P = PRICES['deepseek-flash']   // corrected card, see tools/prices.mjs
const gw = []
for (const l of readFileSync('results/gateway.jsonl', 'utf8').split('\n')) { if (l.trim()) { try { gw.push(JSON.parse(l)) } catch {} } }
const { byRun } = indexByRun(gw)

const perTaskArm = new Map() // task -> arm -> [costs]
const dirs = readdirSync('results').filter((d) => d.startsWith('check-') && d !== 'check-example-fix')
for (const d of dirs) {
  const f = join('results', d, 'runs.jsonl')
  if (!existsSync(f)) continue
  const runs = []
  for (const l of readFileSync(f, 'utf8').split('\n')) { if (l.trim()) { try { runs.push(JSON.parse(l)) } catch {} } }
  if (runs.length < 10) continue
  const task = d.slice(6)
  for (const r of runs) {
    const reqs = byRun.get(r.runId) ?? []
    if (!reqs.length) continue
    let c = 0
    for (const q of reqs) {
      const u = q.usage ?? {}
      c += ((u.cacheMissTokens ?? 0) / 1e6) * P.miss + ((u.cacheHitTokens ?? 0) / 1e6) * P.hit + ((u.outputTokens ?? 0) / 1e6) * P.out
    }
    if (!perTaskArm.has(task)) perTaskArm.set(task, new Map())
    const m = perTaskArm.get(task)
    if (!m.has(r.arm)) m.set(r.arm, [])
    m.get(r.arm).push(c)
  }
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length
const sd = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)) }
const tasks = [...perTaskArm.keys()]

console.log('tasks with complete data: ' + tasks.length)
console.log('')
console.log('PAIRED CONTRASTS — per-task differences, the unit the study analyses')
console.log('  ' + 'contrast'.padEnd(30) + 'mean diff'.padStart(11) + '% diff'.padStart(9) + 'sd diff'.padStart(10) + 'tasks for 80%'.padStart(15))
const z = 7.85
const pairs = [['dsh:native', 'opencode'], ['dsh:native', 'dsh:ptc'], ['dsh:native-opt', 'dsh:ptc-opt'], ['dsh:ptc', 'opencode'], ['dsh:ptc-opt', 'dsh:ptc']]
const out = []
for (const [a, b] of pairs) {
  const diffs = []
  for (const t of tasks) {
    const m = perTaskArm.get(t)
    if (!m?.has(a) || !m?.has(b)) continue
    diffs.push(mean(m.get(b)) - mean(m.get(a)))
  }
  if (diffs.length < 5) continue
  const md = mean(diffs), s = sd(diffs)
  const base = mean(tasks.flatMap((t) => (perTaskArm.get(t)?.get(a) ?? [])))
  const n80 = md !== 0 ? Math.ceil(z * s * s / (md * md)) : Infinity
  out.push({ a, b, md, pct: md / base, s, n80, n: diffs.length })
  console.log('  ' + (a + ' vs ' + b).padEnd(30) + ('$' + md.toFixed(5)).padStart(11) + ((md / base * 100).toFixed(1) + '%').padStart(9) +
    ('$' + s.toFixed(5)).padStart(10) + String(n80 === Infinity ? 'never' : n80).padStart(15))
}
console.log('')
console.log('NOTE: n above is the number of TASK BLOCKS needed at 80% power, alpha=0.05,')
console.log('two-sided, using the observed between-task SD of the difference. 2 seeds per')
console.log('arm per task already average out most within-task noise.')
console.log('')
const big = out.filter((o) => o.n80 <= 30 && o.n80 > 0)
console.log('detectable with 30 tasks: ' + big.length + ' of ' + out.length + ' contrasts')
for (const o of out.filter((o) => o.n80 > 30 || o.n80 <= 0)) {
  console.log('  NEEDS MORE: ' + o.a + ' vs ' + o.b + '  (' + (o.n80 === Infinity ? 'no effect detected' : o.n80 + ' tasks') + ', effect ' + (o.pct * 100).toFixed(1) + '%)')
}
