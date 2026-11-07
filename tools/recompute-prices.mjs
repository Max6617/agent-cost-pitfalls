import { readFileSync, existsSync } from 'node:fs'
import { indexByRun } from './attribute.mjs'
import { PRICES, RETRACTED } from './prices.mjs'
// Cards come from tools/prices.mjs (single copy). `fresh` here is that module's `miss`.
// The corrected DeepSeek card is from _ev/deepseek-pricing.html, 2026-09-28, off-peak column.
const _ds = PRICES['deepseek-flash']
const _glm = PRICES['glm-5.3-flash']
const _glm53 = PRICES['glm-5.3']
const _old = RETRACTED['deepseek-flash']
const CARDS = {
  deepseek: { fresh: _ds.miss, hit: _ds.hit, out: _ds.out, label: 'deepseek-flash off-peak (captured)' },
  // The study's RETRACTED card, kept ONLY so the before/after difference stays visible.
  deepseek_old: { fresh: _old.miss, hit: _old.hit, out: _old.out, label: 'deepseek RETRACTED card (comparison only)' },
  // z.ai: NO capture exists. Using the study's card and flagging it.
  glm: { fresh: _glm.miss, hit: _glm.hit, out: _glm.out, label: 'glm-5.3-flash (UNCITED - no page capture)' },
  glm53: { fresh: _glm53.miss, hit: _glm53.hit, out: _glm53.out, label: 'glm-5.3 (UNCITED)' },
}
function load(gwP, runsP) {
  const gw = readFileSync(gwP, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  const { byRun } = indexByRun(gw)
  const runs = existsSync(runsP) ? readFileSync(runsP, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean) : []
  return { byRun, runs }
}
// A run is valid only if it did not fail on provider quota (pre-registration rule).
const isQuota = (r) => /QUOTA|Insufficient Balance|no resource package/i.test((r.stderrTail ?? '') + (r.stdoutTail ?? ''))
function perArm(gwP, runsP, card) {
  const { byRun, runs } = load(gwP, runsP)
  const acc = {}
  for (const r of runs) {
    if (isQuota(r)) continue
    const reqs = byRun.get(r.runId) ?? []
    if (!reqs.length) continue
    const a = acc[r.arm] = acc[r.arm] ?? { c: 0, n: 0, hit: 0, miss: 0, out: 0 }
    a.n++
    for (const q of reqs) {
      const u = q.usage ?? {}
      const hit = u.cacheHitTokens ?? 0, miss = u.cacheMissTokens ?? 0, out = u.outputTokens ?? 0
      a.hit += hit; a.miss += miss; a.out += out
      a.c += (miss / 1e6) * card.fresh + (hit / 1e6) * card.hit + (out / 1e6) * card.out
    }
  }
  return acc
}
function report(label, gwP, runsP, card) {
  const a = perArm(gwP, runsP, card)
  console.log('')
  console.log('=== ' + label + '  [' + card.label + ']')
  console.log('  ' + 'arm'.padEnd(20) + 'cost/run'.padStart(10) + 'cache'.padStart(8) + 'out rate'.padStart(9))
  const out = {}
  for (const k of Object.keys(a).sort()) {
    const v = a[k]
    out[k] = v.c / v.n
    const cr = (v.hit + v.miss) > 0 ? (v.hit / (v.hit + v.miss) * 100).toFixed(1) + '%' : 'n/a'
    console.log('  ' + k.padEnd(20) + ('$' + (v.c / v.n).toFixed(5)).padStart(10) + cr.padStart(8) + ('$' + (card.out / 1e6 * (v.out / v.n)).toFixed(4)).padStart(9))
  }
  return out
}
console.log('RATIOS, corrected (from tools/prices.mjs):')
console.log('  deepseek-flash  output:input = ' + (_ds.out / _ds.miss).toFixed(2) + '   cache discount = ' + (_ds.miss / _ds.hit).toFixed(0) + 'x')
console.log('  glm-5.3-flash   output:input = ' + (_glm.out / _glm.miss).toFixed(2) + '   cache discount = ' + (_glm.miss / _glm.hit).toFixed(0) + 'x   (uncited)')
console.log('')
const dsOld = report('DeepSeek - OLD card', 'results/gateway.jsonl', 'results/ds-full-partial/runs.jsonl', CARDS.deepseek_old)
const dsNew = report('DeepSeek - CORRECTED card', 'results/gateway.jsonl', 'results/ds-full-partial/runs.jsonl', CARDS.deepseek)
console.log('')
const gfl = report('GLM-5.3-Flash', 'results/glm-gateway.jsonl', 'results/glm-flash/runs.jsonl', CARDS.glm)
const g53 = report('GLM-5.3', 'results/glm53-gateway.jsonl', 'results/glm53/runs.jsonl', CARDS.glm53)
function ptc(out, label) {
  const p = out['dsh:ptc'], n = out['dsh:native']
  if (!p || !n) { console.log('  ' + label + ': missing arms'); return }
  const d = (p - n) / n * 100
  console.log('  ' + label.padEnd(28) + (d < 0 ? 'PTC cheaper by ' + (-d).toFixed(1) + '%' : 'PTC costs ' + d.toFixed(1) + '% MORE'))
}
console.log('')
console.log('*** PTC vs NATIVE ***')
ptc(dsOld, 'DeepSeek, RETRACTED card (ratio 2.0)')
ptc(dsNew, 'DeepSeek, corrected (ratio 4.0)')
ptc(gfl, 'GLM-Flash (ratio 3.33)')
ptc(g53, 'GLM-5.3 (ratio 3.14)')