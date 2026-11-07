/**
 * probe — what else does this setup already contain?
 *
 * All of this is computable from logs we have already paid for. The question is
 * which angles carry signal, before committing runs to any of them.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { indexByRun } from './attribute.mjs'

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
const sd = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)) }

// ---- gather DeepSeek sweep (15 tasks) ------------------------------------------
const gw = []
for (const l of readFileSync('results/gateway.jsonl', 'utf8').split('\n')) { if (l.trim()) { try { gw.push(JSON.parse(l)) } catch {} } }
const { byRun } = indexByRun(gw)

const obs = []
for (const d of readdirSync('results').filter((x) => x.startsWith('check-') && x !== 'check-example-fix')) {
  const f = join('results', d, 'runs.jsonl')
  if (!existsSync(f)) continue
  const runs = []
  for (const l of readFileSync(f, 'utf8').split('\n')) { if (l.trim()) { try { runs.push(JSON.parse(l)) } catch {} } }
  if (runs.length < 10) continue
  const task = d.slice(6)
  // task size proxy: total fixture lines
  let lines = 0
  const fx = join('tasks', task, 'fixture')
  if (existsSync(fx)) {
    const walk = (p) => { for (const e of readdirSync(p, { withFileTypes: true })) { const q = join(p, e.name); if (e.isDirectory()) walk(q); else lines += readFileSync(q, 'utf8').split('\n').length } }
    walk(fx)
  }
  for (const r of runs) {
    const reqs = byRun.get(r.runId) ?? []
    if (!reqs.length) continue
    let cost = 0, hit = 0, miss = 0, out = 0, lat = 0, bad = 0, firstIn = null
    reqs.forEach((q, i) => {
      const u = q.usage ?? {}
      hit += u.cacheHitTokens ?? 0; miss += u.cacheMissTokens ?? 0; out += u.outputTokens ?? 0
      cost += q.cost?.billedUsd ?? 0
      lat += q.latencyMs ?? 0
      if (q.status !== 200) bad++
      if (i === 0) firstIn = u.inputTokens ?? null
    })
    obs.push({ task, arm: r.arm, lines, cost, steps: reqs.length, lat, bad, firstIn, hit, miss, out, solved: r.solved })
  }
}
console.log('observations: ' + obs.length + '   tasks: ' + new Set(obs.map((o) => o.task)).size)
const arms = [...new Set(obs.map((o) => o.arm))]

// ---- A. does cost scale with task size, and do the rankings CROSS? --------------
console.log('')
console.log('A. COST vs TASK SIZE  (fixture lines)')
const sizes = obs.map((o) => o.lines)
console.log('   task size range: ' + Math.min(...sizes) + ' .. ' + Math.max(...sizes) + ' lines')
console.log('   ' + 'arm'.padEnd(18) + 'slope$/line'.padStart(13) + 'r'.padStart(8))
for (const a of arms) {
  const rs = obs.filter((o) => o.arm === a)
  const xs = rs.map((o) => o.lines), ys = rs.map((o) => o.cost)
  const mx = mean(xs), my = mean(ys)
  let num = 0, den = 0
  for (let i = 0; i < xs.length; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2 }
  const slope = den ? num / den : 0
  let n2 = 0, dx = 0, dy = 0
  for (let i = 0; i < xs.length; i++) { n2 += (xs[i] - mx) * (ys[i] - my); dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2 }
  const r = dx && dy ? n2 / Math.sqrt(dx * dy) : 0
  console.log('   ' + a.padEnd(18) + ('$' + slope.toFixed(6)).padStart(13) + r.toFixed(2).padStart(8))
}

// ---- B. latency as a second axis -----------------------------------------------
console.log('')
console.log('B. LATENCY  (ms per run, summed over requests)')
console.log('   ' + 'arm'.padEnd(18) + 'median'.padStart(9) + 'mean'.padStart(9) + 'cost'.padStart(11) + '$/s'.padStart(9))
for (const a of arms) {
  const rs = obs.filter((o) => o.arm === a)
  const lat = rs.map((o) => o.lat).sort((x, y) => x - y)
  const c = mean(rs.map((o) => o.cost))
  console.log('   ' + a.padEnd(18) + String(Math.round(lat[Math.floor(lat.length / 2)])).padStart(9) +
    String(Math.round(mean(lat))).padStart(9) + ('$' + c.toFixed(5)).padStart(11) + (c / (mean(lat) / 1000)).toExponential(2).padStart(9))
}

// ---- C. cost variance: which harness can you BUDGET for? ------------------------
console.log('')
console.log('C. PREDICTABILITY  (per-run cost spread within an arm)')
console.log('   ' + 'arm'.padEnd(18) + 'mean'.padStart(11) + 'sd'.padStart(10) + 'cv'.padStart(8) + 'cv-within-task'.padStart(16))
for (const a of arms) {
  const rs = obs.filter((o) => o.arm === a)
  const c = rs.map((o) => o.cost)
  const byTask = new Map()
  for (const o of rs) { if (!byTask.has(o.task)) byTask.set(o.task, []); byTask.get(o.task).push(o.cost) }
  const cvs = [...byTask.values()].map((v) => (v.length > 1 && mean(v) > 0 ? sd(v) / mean(v) : null)).filter((x) => x != null)
  console.log('   ' + a.padEnd(18) + ('$' + mean(c).toFixed(5)).padStart(11) + ('$' + sd(c).toFixed(5)).padStart(10) +
    ((sd(c) / mean(c)) * 100).toFixed(1).padStart(7) + '%' + ((mean(cvs) * 100).toFixed(1) + '%').padStart(15))
}

// ---- D. fixed prefix cost: the price of presenting N tools ----------------------
console.log('')
console.log('D. FIXED PREFIX  (first-request input tokens = system prompt + tool schemas)')
for (const a of arms) {
  const rs = obs.filter((o) => o.arm === a && o.firstIn != null)
  if (!rs.length) continue
  console.log('   ' + a.padEnd(18) + Math.round(mean(rs.map((o) => o.firstIn))).toLocaleString().padStart(10) + ' tokens')
}

// ---- E. wasted spend -------------------------------------------------------------
console.log('')
console.log('E. FAILED REQUESTS  (paid for, produced nothing)')
for (const a of arms) {
  const rs = obs.filter((o) => o.arm === a)
  const tot = rs.reduce((s2, o) => s2 + o.steps, 0), bad = rs.reduce((s2, o) => s2 + o.bad, 0)
  console.log('   ' + a.padEnd(18) + bad + ' of ' + tot + '  (' + ((bad / Math.max(1, tot)) * 100).toFixed(1) + '%)')
}
