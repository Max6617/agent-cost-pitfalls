/**
 * cache-ab.mjs - the three-condition Anthropic caching experiment.
 *
 * THE QUESTION. FINDINGS F31 says the variable that decides a cross-provider cost ranking is
 * whether the provider caches automatically or makes the client declare breakpoints. That was
 * an inference from observation: five providers cache automatically and sit at 87-91%, Anthropic
 * makes the client ask and sits at 10-17%. This experiment turns it into a manipulation.
 *
 * THE THREE CONDITIONS. Identical tasks, identical arms, identical model; only the request
 * field differs. All three are recorded as deviations in the gateway log, so a run's treatment
 * is recoverable from the archive rather than from remembering which launcher started it.
 *
 *   none    --no-cache-breakpoints   no cache_control is sent at all: the harness's raw behaviour
 *   static  (default)                the system + last-tool breakpoints this gateway injects
 *   auto    --auto-cache             static, PLUS the top-level field that carries the breakpoint
 *                                    forward as the conversation grows
 *
 * "static" is the condition EVERY pre-existing Anthropic number in this repo was collected
 * under, and it was not disclosed as a condition until an external review flagged it. Running
 * it again here is what makes the other two comparable: without it, the comparison would be
 * against data from a different day.
 *
 * Usage: node tools/cache-ab.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { parseSyntheticKey } from './attribute.mjs'
import { PRICES, cardFor } from './prices.mjs'
import { exclusionVerdict } from './exclusions.mjs'
import { makeRng } from './rng.mjs'

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
// --tag names the experiment instance, so a second model's A/B does not silently overwrite the
// first one's output. The original run had no tag and hardcoded its own paths; that works exactly
// once.
const TAG = opt('--tag', null)
const dir = (c) => (TAG ? 'results/cache-ab-' + TAG + '-' + c : 'results/cache-ab-' + c)
const gw = (c) => (TAG ? 'results/cacheab-' + TAG + '-' + c + '-gateway.jsonl' : 'results/cacheab-' + c + '-gateway.jsonl')
const CONDITIONS = [
  { id: 'none', runs: dir('none') + '/runs.jsonl', gw: gw('none'), label: 'none (harness as-is)' },
  { id: 'static', runs: dir('static') + '/runs.jsonl', gw: gw('static'), label: 'static breakpoints' },
  { id: 'auto', runs: dir('auto') + '/runs.jsonl', gw: gw('auto'), label: 'static + automatic' },
]

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN)
// See tools/rng.mjs.
const rnd = makeRng(424242)
function boot(vals, iters = 5000) {
  if (!vals.length) return { lo: NaN, hi: NaN }
  const bs = []
  for (let i = 0; i < iters; i++) { let s = 0; for (let j = 0; j < vals.length; j++) s += vals[Math.floor(rnd() * vals.length)]; bs.push(s / vals.length) }
  bs.sort((a, b) => a - b)
  return { lo: bs[Math.floor(0.025 * iters)], hi: bs[Math.floor(0.975 * iters)] }
}

/** Per-request usage for a condition, straight from its own gateway log. */
function requests(cond) {
  if (!existsSync(cond.gw)) return []
  const byRun = new Map()
  for (const line of readFileSync(cond.gw, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let o; try { o = JSON.parse(line) } catch { continue }
    const a = parseSyntheticKey(o.syntheticKey)
    const rid = a?.runId ?? o.runId
    if (!rid) continue
    if (!byRun.has(rid)) byRun.set(rid, [])
    byRun.get(rid).push(o)
  }
  return byRun
}

const out = {}
console.log('ANTHROPIC CACHING A/B - three conditions, one model, one task set')
console.log('(model and task set are recorded in the run records; tag: ' + (TAG ?? 'untagged') + ')\n')
console.log('  ' + 'condition'.padEnd(24) + 'runs'.padStart(5) + 'solved'.padStart(8) + 'requests'.padStart(10) +
  'input tok'.padStart(12) + 'cached'.padStart(10) + 'HIT RATE'.padStart(10) + '$/run'.padStart(10) + '  creation tok')

for (const cond of CONDITIONS) {
  if (!existsSync(cond.runs)) { console.log('  ' + cond.label.padEnd(24) + '  (not run yet)'); continue }
  const rows = readFileSync(cond.runs, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const byRun = requests(cond)
  // THE CARD FOLLOWS THE RUNS, NOT THE TOOL. This was hardcoded to the Haiku card while the tool
  // accepts --tag sonnet, and the Sonnet card is exactly 2x the Haiku card on all four components -
  // so every Sonnet dollar in FINDINGS F37 was half the true value, with the hit rates, ratios and
  // paired contrasts surviving untouched because a uniform scaling cannot move them. The defect sat
  // inside the flagship finding, survived two correction passes, and was found by a third review
  // one commit after a commit titled "price provenance closed".
  // A missing card used to warn and then price the run on Haiku's card anyway. A warning printed
  // above a table of wrong dollars is not a guard: an unknown model is fatal now.
  const card = cardFor(model ?? 'claude-haiku-4.5', { required: true })
  let hit = 0, fresh = 0, created = 0, outp = 0, reqs = 0, billed = 0, runs = 0, solved = 0
  let dropByText = 0, dropByStatus = 0
  const perRun = []
  for (const r of rows) {
    const rs = byRun.get(r.runId) ?? []
    // ONE decision, from ONE function (tools/exclusions.mjs). It applies rule 9's text half, its
    // status half, and the solved-guard. The status half is what caught the 50 Sonnet and 60 Haiku
    // runs whose entire request history was HTTP 400 - a provider credit exhaustion the text rule
    // had no phrase for.
    const v = exclusionVerdict(r, rs)
    if (v.excluded) { if (v.half === 'status') dropByStatus++; else dropByText++; continue }
    if (!rs.length) continue
    runs++; if (r.solved) solved++
    let b = 0
    for (const q of rs) {
      const u = q.usage ?? {}
      const h = u.cacheHitTokens ?? 0
      const m = u.cacheMissTokens ?? Math.max(0, (u.inputTokens ?? 0) - h)
      const c = u.cacheCreationTokens ?? 0
      // f = m, NOT max(0, m - c): the token buckets are disjoint. See tools/prices.mjs costOf.
      const f = m
      hit += h; fresh += f; created += c; outp += u.outputTokens ?? 0; reqs++
      b += (f / 1e6) * card.miss + (c / 1e6) * (card.write ?? card.miss) + (h / 1e6) * card.hit + ((u.outputTokens ?? 0) / 1e6) * card.out
    }
    perRun.push({ task: r.task, arm: r.arm, cost: b, solved: !!r.solved,
      hitRate: (() => { let H = 0, T = 0; for (const q of rs) { const u = q.usage ?? {}; const h = u.cacheHitTokens ?? 0; H += h; T += (u.inputTokens ?? 0) } return T ? H / T : 0 })() })
    billed += b
  }
  const totalIn = hit + fresh + created
  const rate = totalIn ? hit / totalIn : 0
  console.log('  ' + cond.label.padEnd(24) + String(runs).padStart(5) + String(solved).padStart(8) + String(reqs).padStart(10) +
    '' + (dropByText + dropByStatus ? '' : '') +
    totalIn.toLocaleString().padStart(12) + hit.toLocaleString().padStart(10) + (rate * 100).toFixed(1).padStart(9) + '%' +
    ('$' + (billed / runs).toFixed(4)).padStart(10) + '  ' + created.toLocaleString())
  out[cond.id] = { label: cond.label, runs, solved, droppedByText: dropByText, droppedByStatus: dropByStatus, reqs, inputTokens: totalIn, hitTokens: hit, createdTokens: created, hitRate: rate, costPerRun: billed / runs, totalCost: billed, perRun }
}

console.log('\n--- paired by (task, arm), static = baseline ---')
if (out.static) {
  for (const id of ['none', 'auto']) {
    if (!out[id]) continue
    const key = (p) => p.task + '|' + p.arm
    const base = new Map(out.static.perRun.map((p) => [key(p), p]))
    const pairs = out[id].perRun.filter((p) => base.has(key(p))).map((p) => ({ ...p, b: base.get(key(p)) }))
    if (!pairs.length) continue
    const dCost = pairs.map((p) => p.cost - p.b.cost)
    const dHit = pairs.map((p) => p.hitRate - p.b.hitRate)
    const ciC = boot(dCost), ciH = boot(dHit)
    const rel = mean(dCost) / mean(pairs.map((p) => p.b.cost)) * 100
    console.log('  ' + out[id].label.padEnd(24) + 'n=' + String(pairs.length).padStart(3) +
      '  cost ' + (rel >= 0 ? '+' : '') + rel.toFixed(1) + '%  CI [' + (ciC.lo / mean(pairs.map((p) => p.b.cost)) * 100).toFixed(1) + '%, ' + (ciC.hi / mean(pairs.map((p) => p.b.cost)) * 100).toFixed(1) + '%]' +
      '   hit rate ' + (mean(pairs.map((p) => p.b.hitRate)) * 100).toFixed(1) + '% -> ' + (mean(pairs.map((p) => p.hitRate)) * 100).toFixed(1) + '%' +
      '  (' + (mean(dHit) * 100 >= 0 ? '+' : '') + (mean(dHit) * 100).toFixed(1) + ' pp, CI [' + (ciH.lo * 100).toFixed(1) + ', ' + (ciH.hi * 100).toFixed(1) + '] pp)')
  }
}

console.log('\n--- per arm ---')
const arms = [...new Set(Object.values(out).flatMap((c) => c.perRun.map((p) => p.arm)))].sort()
console.log('  ' + 'arm'.padEnd(18) + Object.keys(out).map((k) => (out[k].label + ' $/run').padStart(22)).join('') + '   hit rate none/static/auto')
for (const arm of arms) {
  const cells = Object.keys(out).map((k) => {
    const rows = out[k].perRun.filter((p) => p.arm === arm)
    return rows.length ? mean(rows.map((p) => p.cost)) : NaN
  })
  const hr = Object.keys(out).map((k) => { const rows = out[k].perRun.filter((p) => p.arm === arm); return rows.length ? mean(rows.map((p) => p.hitRate)) : NaN })
  console.log('  ' + arm.padEnd(18) + cells.map((c) => (Number.isFinite(c) ? '$' + c.toFixed(5) : '-').padStart(22)).join('') +
    '   ' + hr.map((h) => (Number.isFinite(h) ? (h * 100).toFixed(0) + '%' : '-')).join(' / '))
}

const ji = process.argv.indexOf('--json')
if (ji >= 0) {
  const { writeFileSync, mkdirSync } = await import('node:fs')
  const p = process.argv[ji + 1] ?? (TAG ? 'analysis/cache-ab-' + TAG + '.json' : 'analysis/cache-ab.json')
  mkdirSync(p.split(/[\\/]/).slice(0, -1).join('/') || '.', { recursive: true })
  writeFileSync(p, JSON.stringify({ generated: new Date().toISOString(), conditions: out }, null, 1))
  console.log('\nwrote ' + p)
}
