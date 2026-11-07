/**
 * rederive.mjs - recompute every headline number under the PRE-REGISTERED cost
 * function and the CORRECTED price card.
 *
 * Why this exists: analyze-results.mjs computed billedUsd WITHOUT the output term,
 * while PRE-REGISTRATION.md:53-56 defines cost_billed as
 *   fresh x missRate + created x writeRate + hit x hitRate + output x outRate
 * The two produce different answers, and the wrong one produced the paper's headline
 * claim that the ranking inverts. An outside review caught it; this re-derives from
 * the archived token counts, which were always correct.
 *
 * Card from _ev/deepseek-pricing.html (captured 2026-09-28), off-peak column.
 */
import { readFileSync, existsSync } from 'node:fs'
import { indexByRun } from './attribute.mjs'
import { PRICES } from './prices.mjs'

// Cards from tools/prices.mjs (single copy); write defaults to the miss rate.
const card = (m, src) => { const c = PRICES[m]; return { miss: c.miss, hit: c.hit, write: c.write ?? c.miss, out: c.out, src } }
const CARD = {
  deepseek: card('deepseek-flash', 'captured page'),
  glm:      card('glm-5.3-flash', 'UNCITED'),
  glm53:    card('glm-5.3', 'UNCITED'),
  haiku:    card('claude-haiku-4.5', 'UNCITED'),
}

// A run is valid only if it did not fail on provider quota. Pre-registration rule 9.
const isQuota = (r) => /QUOTA|Insufficient Balance|no resource package/i.test((r.stderrTail ?? '') + (r.stdoutTail ?? ''))

function collect(gwPath, runsPath) {
  const gw = readFileSync(gwPath, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  const { byRun } = indexByRun(gw)
  const runs = existsSync(runsPath) ? readFileSync(runsPath, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean) : []
  return { byRun, runs }
}

/** The PRE-REGISTERED cost_billed: output and cache writes both included. */
function billed(t, c) {
  return (t.fresh / 1e6) * c.miss + (t.created / 1e6) * c.write + (t.hit / 1e6) * c.hit + (t.out / 1e6) * c.out
}
/** cost_cold: every input token at the miss rate, output still included. */
function cold(t, c) {
  return ((t.fresh + t.created + t.hit) / 1e6) * c.miss + (t.out / 1e6) * c.out
}

function byArm(gwPath, runsPath, card) {
  const { byRun, runs } = collect(gwPath, runsPath)
  const acc = {}
  let excluded = 0, noReqs = 0
  for (const r of runs) {
    if (isQuota(r)) { excluded++; continue }
    const reqs = byRun.get(r.runId) ?? []
    if (!reqs.length) { noReqs++; continue }
    const a = acc[r.arm] = acc[r.arm] ?? { n: 0, solved: 0, billed: 0, cold: 0, tokens: { fresh: 0, created: 0, hit: 0, out: 0 }, reqs: 0 }
    a.n++; if (r.solved) a.solved++
    for (const q of reqs) {
      const u = q.usage ?? {}
      const hit = u.cacheHitTokens ?? 0, miss = u.cacheMissTokens ?? 0
      const created = u.cacheCreationTokens ?? 0, out = u.outputTokens ?? 0
      // fresh = miss, NOT max(0, miss - created): the token buckets are disjoint.
      const fresh = miss
      const t = { fresh, created, hit, out }
      a.tokens.fresh += fresh; a.tokens.created += created; a.tokens.hit += hit; a.tokens.out += out
      a.billed += billed(t, card); a.cold += cold(t, card); a.reqs++
    }
  }
  return { acc, excluded, noReqs }
}

function show(label, gwPath, runsPath, card) {
  if (!existsSync(gwPath) || !existsSync(runsPath)) { console.log('  ' + label + ': no data'); return null }
  const { acc, excluded, noReqs } = byArm(gwPath, runsPath, card)
  console.log('')
  console.log('=== ' + label + '   [card: ' + card.src + ']')
  if (excluded || noReqs) console.log('  excluded: ' + excluded + ' quota-failed, ' + noReqs + ' with no gateway records')
  console.log('  ' + 'arm'.padEnd(18) + 'n'.padStart(4) + 'solved'.padStart(8) + 'cost_billed'.padStart(13) + 'cost_cold'.padStart(12) + 'reqs'.padStart(6))
  const rows = []
  for (const k of Object.keys(acc).sort()) {
    const a = acc[k]
    rows.push([k, a])
    console.log('  ' + k.padEnd(18) + String(a.n).padStart(4) + (a.solved + '/' + a.n).padStart(8) +
      ('$' + (a.billed / a.n).toFixed(5)).padStart(13) + ('$' + (a.cold / a.n).toFixed(5)).padStart(12) + String(a.reqs).padStart(6))
  }
  const byBilled = [...rows].sort((x, y) => x[1].billed / x[1].n - y[1].billed / y[1].n)
  const byCold = [...rows].sort((x, y) => x[1].cold / x[1].n - y[1].cold / y[1].n)
  console.log('')
  console.log('  RANK by cost_billed : ' + byBilled.map((r) => r[0]).join('  <  '))
  console.log('  RANK by cost_cold   : ' + byCold.map((r) => r[0]).join('  <  '))
  const same = byBilled.map((r) => r[0]).join() === byCold.map((r) => r[0]).join()
  console.log('  ranking INVERTS?    : ' + (same ? 'NO - same order under both metrics' : 'YES - the two orders differ'))
  return { rows, byBilled, byCold, same }
}

console.log('PRE-REGISTERED cost function, CORRECTED card.')
console.log('cost_billed = fresh*miss + created*write + hit*hit + output*out')

const ds = show('DeepSeek V4.1 Flash - full matrix (partial, credit-exhausted)', 'results/gateway.jsonl', 'results/ds-full-partial/runs.jsonl', CARD.deepseek)
show('DeepSeek V4.1 Flash - old 15-task sweep', 'results/gateway.jsonl', 'results/check-fetch-heavy-duration-parse/runs.jsonl', CARD.deepseek)
const gfl = show('GLM-5.3-Flash', 'results/glm-gateway.jsonl', 'results/glm-flash/runs.jsonl', CARD.glm)
const g53 = show('GLM-5.3', 'results/glm53-gateway.jsonl', 'results/glm53/runs.jsonl', CARD.glm53)

function ptc(x, label) {
  if (!x) return
  const get = (k) => { const r = x.rows.find((q) => q[0] === k); return r ? r[1] : null }
  const p = get('dsh:ptc'), n = get('dsh:native')
  if (!p || !n) { console.log('  ' + label + ': missing arm'); return }
  const b = ((p.billed / p.n) - (n.billed / n.n)) / (n.billed / n.n) * 100
  const c = ((p.cold / p.n) - (n.cold / n.n)) / (n.cold / n.n) * 100
  console.log('  ' + label.padEnd(22) + 'cost_billed ' + (b < 0 ? 'PTC -' + (-b).toFixed(1) + '%' : 'PTC +' + b.toFixed(1) + '%') +
    '   cost_cold ' + (c < 0 ? 'PTC -' + (-c).toFixed(1) + '%' : 'PTC +' + c.toFixed(1) + '%'))
}
console.log('')
console.log('*** PTC vs NATIVE, both metrics ***')
ptc(ds, 'DeepSeek (ratio 4.00)')
ptc(gfl, 'GLM-5.3-Flash (3.33)')
ptc(g53, 'GLM-5.3 (3.14)')