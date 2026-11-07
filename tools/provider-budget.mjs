import { readFileSync, existsSync } from 'node:fs'
import { indexByRun } from './attribute.mjs'
import { PRICES } from './prices.mjs'
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

// MEASURED per-run cost wherever the dataset exists. Never extrapolated from a sibling.
function measured(gwPath, runsPath) {
  if (!existsSync(runsPath)) return null
  const gw = []
  for (const l of readFileSync(gwPath, 'utf8').split('\n')) { if (l.trim()) { try { gw.push(JSON.parse(l)) } catch {} } }
  const { byRun } = indexByRun(gw)
  const runs = readFileSync(runsPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  let cost = 0, n = 0, out = 0, steps = 0
  for (const r of runs) {
    const reqs = byRun.get(r.runId) ?? []
    if (!reqs.length) continue
    n++; steps += reqs.length
    for (const q of reqs) { cost += q.cost?.billedUsd ?? 0; out += q.usage?.outputTokens ?? 0 }
  }
  return n ? { perRun: cost / n, outPerRun: out / n, n } : null
}

console.log('MEASURED per-run cost (never extrapolated):')
const M = {}
for (const [k, gw, rp] of [
  ['deepseek-flash', 'results/gateway.jsonl', 'results/check-single-step-parse-negative/runs.jsonl'],
  ['glm-5.3-flash', 'results/glm-gateway.jsonl', 'results/glm-flash/runs.jsonl'],
  ['glm-5.3', 'results/glm53-gateway.jsonl', 'results/glm53/runs.jsonl'],
]) {
  const m = measured(gw, rp)
  if (m) { M[k] = m; console.log('  ' + k.padEnd(18) + '$' + m.perRun.toFixed(5) + '/run   out ' + Math.round(m.outPerRun).toLocaleString() + '/run   (n=' + m.n + ')') }
}
console.log('')

const TASKS = 31
const NEED = [
  ['deepseek', 'DeepSeek', 'deepseek-flash', 15,
    'fl', PRICES['deepseek-flash']],
  ['zai', 'Z.AI (GLM)', 'glm-5.3-flash', 31,
    'fl', PRICES['glm-5.3-flash']],
  ['zai', 'Z.AI (GLM)', 'glm-5.3', 15,
    '53', PRICES['glm-5.3']],
]
// token profiles: measured where possible
const PROF = {
  fl: { hit: 123249, miss: 14328, out: 4357 },
  '53': { hit: 123249, miss: 14328, out: 7936 },   // GLM-5.3 measured: 595202 out over 75 runs
}
const cost = (p, prof) => (prof.miss / 1e6) * p.miss + (prof.hit / 1e6) * p.hit + (prof.out / 1e6) * p.out

console.log('WHAT EACH EXISTING PROVIDER STILL NEEDS (to reach 31 tasks, 6 arms, 2 seeds)')
console.log('  ' + 'provider'.padEnd(14) + 'model'.padEnd(18) + 'have'.padStart(5) + 'need'.padStart(6) + '$/run'.padStart(10) + 'TOTAL'.padStart(9))
let done = 0
for (const [, label, model, have, prof, price] of NEED) {
  const need = (TASKS - have) * 6 * 2
  const c = M[model]?.perRun ?? cost(price, PROF[prof])
  console.log('  ' + label.padEnd(14) + model.padEnd(18) + String(have).padStart(5) + String(need).padStart(6) + ('$' + c.toFixed(5)).padStart(10) + ('$' + (need * c).toFixed(2)).padStart(9))
  done += need * c
}
console.log('  ' + ''.padEnd(32) + 'subtotal' + ('$' + done.toFixed(2)).padStart(23))

console.log('')
console.log('NEW PROVIDERS — baseline vs 1.8x-verbose, because the verbosity of an unseen model is unknown')
console.log('  ' + 'provider'.padEnd(22) + 'model'.padEnd(18) + '31x6x2'.padStart(8) + 'cheap'.padStart(10) + 'verbose'.padStart(10))
const NEW = [
  ['Alibaba (Qwen)', 'qwen3.8-flash', PRICES['qwen3.8-flash']],
  ['Anthropic', 'claude-haiku-4.5', PRICES['claude-haiku-4.5']],
  ['Anthropic', 'claude-sonnet-5.5', PRICES['claude-sonnet-5.5']],
  ['OpenAI', 'gpt-6-luna', PRICES['gpt-6-luna']],
  ['OpenAI', 'gpt-6.1-sol', PRICES['gpt-6.1-sol']],
]
const base = PROF.fl
const verb = { hit: base.hit, miss: base.miss, out: base.out * 1.8 }
const perProv = {}
for (const [prov, model, price] of NEW) {
  const nr = TASKS * 6 * 2
  const lo = cost(price, base) * nr, hi = cost(price, verb) * nr
  console.log('  ' + prov.padEnd(22) + model.padEnd(18) + String(nr).padStart(8) + ('$' + lo.toFixed(2)).padStart(10) + ('$' + hi.toFixed(2)).padStart(10))
  perProv[prov] = (perProv[prov] ?? 0) + lo
}
console.log('')
console.log('PER-PROVIDER SUBTOTALS (new, cheap case):')
for (const [k, v] of Object.entries(perProv)) console.log('  ' + k.padEnd(22) + '$' + v.toFixed(2))
console.log('')
console.log('NO-CACHING WORST CASE for Anthropic/OpenAI (all input at miss rate):')
for (const [prov, model, price] of NEW.filter((n) => n[0] !== 'Alibaba (Qwen)')) {
  const nr = TASKS * 6 * 2
  const w = ((base.hit + base.miss) / 1e6 * price.miss + base.out / 1e6 * price.out) * nr
  console.log('  ' + model.padEnd(22) + '$' + w.toFixed(2))
}
