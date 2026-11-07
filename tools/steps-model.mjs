/**
 * steps-model — Path C: why do harnesses differ in request count?
 *
 * F2 showed cost decomposes into steps x tokens/step, which is bookkeeping. This
 * asks the causal question it leaves open: what are the extra requests DOING?
 *
 * If a harness makes more requests with LESS output each, it is fragmenting work
 * into more round trips. If it makes more requests with the SAME output each, it is
 * doing more work. Those have opposite design implications, and they are separable
 * from the logs already collected.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { indexByRun } from './attribute.mjs'

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

function load(logPath, dirs) {
  const gw = []
  for (const l of readFileSync(logPath, 'utf8').split('\n')) { if (l.trim()) { try { gw.push(JSON.parse(l)) } catch {} } }
  const { byRun } = indexByRun(gw)
  const obs = []
  for (const d of dirs) {
    const f = join('results', d, 'runs.jsonl')
    if (!existsSync(f)) continue
    const runs = []
    for (const l of readFileSync(f, 'utf8').split('\n')) { if (l.trim()) { try { runs.push(JSON.parse(l)) } catch {} } }
    if (runs.length < 5) continue
    for (const r of runs) {
      const reqs = byRun.get(r.runId) ?? []
      if (!reqs.length) continue
      let inn = 0, out = 0, cost = 0, bytes = 0, tools = 0, msgs = 0
      for (const q of reqs) {
        const u = q.usage ?? {}
        inn += u.inputTokens ?? 0; out += u.outputTokens ?? 0
        cost += q.cost?.billedUsd ?? 0
        bytes += q.requestBytes ?? 0
        tools = Math.max(tools, q.tools ?? 0)
        msgs = Math.max(msgs, q.messages ?? 0)
      }
      obs.push({ task: r.task, arm: r.arm, steps: reqs.length, inn, out, cost, bytes, tools, msgs, solved: r.solved })
    }
  }
  return obs
}

function report(label, obs) {
  const arms = [...new Set(obs.map((o) => o.arm))]
  console.log('=== ' + label + '  (' + obs.length + ' runs) ===')
  console.log('  ' + 'arm'.padEnd(18) + 'steps'.padStart(7) + 'outTot'.padStart(9) + 'out/step'.padStart(10) + 'in/step'.padStart(10) + 'in/out'.padStart(9) + 'tools'.padStart(7))
  const rows = {}
  for (const a of arms) {
    const rs = obs.filter((o) => o.arm === a)
    const steps = mean(rs.map((o) => o.steps))
    const outTot = mean(rs.map((o) => o.out))
    const inn = mean(rs.map((o) => o.inn))
    rows[a] = { steps, outTot, outPerStep: outTot / steps, inPerStep: inn / steps, ratio: inn / Math.max(1, outTot), tools: mean(rs.map((o) => o.tools)) }
    const x = rows[a]
    console.log('  ' + a.padEnd(18) + steps.toFixed(1).padStart(7) + Math.round(outTot).toLocaleString().padStart(9) +
      Math.round(x.outPerStep).toLocaleString().padStart(10) + Math.round(x.inPerStep).toLocaleString().padStart(10) +
      Math.round(x.ratio).toLocaleString().padStart(9) + String(Math.round(x.tools)).padStart(7))
  }
  // Fragmentation test: within an arm, are extra steps paid for with less output each?
  console.log('')
  console.log('  FRAGMENTATION: correlation of steps with output-per-step across runs')
  for (const a of arms) {
    const rs = obs.filter((o) => o.arm === a)
    const xs = rs.map((o) => o.steps), ys = rs.map((o) => o.out / o.steps)
    const mx = mean(xs), my = mean(ys)
    let n = 0, dx = 0, dy = 0
    for (let i = 0; i < xs.length; i++) { n += (xs[i] - mx) * (ys[i] - my); dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2 }
    const r = dx && dy ? n / Math.sqrt(dx * dy) : 0
    console.log('    ' + a.padEnd(18) + 'r = ' + r.toFixed(2).padStart(6) + (r < -0.2 ? '   <- more steps, less output each' : ''))
  }
  console.log('')
  return rows
}

const ds = report('DeepSeek V4.1 Flash', load('results/gateway.jsonl', readdirSync('results').filter((d) => d.startsWith('check-') && d !== 'check-example-fix')))
console.log('')
const glm = report('GLM-5.3-Flash', load('results/glm-gateway.jsonl', ['glm-flash']))
console.log('')
console.log('=== TOOLS PRESENTED (max per request) vs STEPS ===')
for (const [n, rows] of [['DeepSeek', ds], ['GLM', glm]]) {
  for (const [a, x] of Object.entries(rows)) console.log('  ' + n.padEnd(10) + a.padEnd(18) + 'tools=' + Math.round(x.tools).toString().padStart(3) + '  steps=' + x.steps.toFixed(1))
}
