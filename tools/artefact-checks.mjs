
/**
 * artefact-checks.mjs - the three internal validity attacks notes/literature/LITERATURE-2.md raises that can be
 * settled from the archive without spending anything.
 *
 * 1. F29 (the placebo) is measured in DOLLARS. A 7.7% gap could encode billing granularity
 *    rather than usage noise. Re-measure it in TOKENS.
 * 2. F37's 85-95% hit rate could be CROSS-RUN: our synthetic-key design shares one real upstream
 *    key, and a shared-credential gateway merges prompt caches across callers. If a run's FIRST
 *    request already shows cache hits, some of the effect is other runs warming the prefix.
 * 3. Anthropic's minimum cacheable prefix is 4,096 tokens for Haiku 4.5 and 512 for Sonnet 5.5,
 *    and a sub-threshold prefix is silently not cached. If an arm's cacheable prefix sits under
 *    the floor, part of the baseline is threshold-silence, not harness behaviour.
 */
import { readFileSync, existsSync } from 'node:fs'
import { parseSyntheticKey } from './attribute.mjs'
import { PRICES } from './prices.mjs'
import { classifyRun } from './exclusions.mjs'

function gw(p) {
  if (!existsSync(p)) return new Map()
  const byRun = new Map()
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let o; try { o = JSON.parse(line) } catch { continue }
    const a = parseSyntheticKey(o.syntheticKey)
    const rid = a?.runId ?? o.runId
    if (!rid) continue
    if (!byRun.has(rid)) byRun.set(rid, [])
    byRun.get(rid).push(o)
  }
  for (const v of byRun.values()) v.sort((x, y) => (x.ts < y.ts ? -1 : 1))
  return byRun
}
function runs(p) {
  return existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean) : []
}

console.log('='.repeat(88))
console.log('1. F29 - is the 7.7% placebo a USAGE effect or a BILLING effect?')
console.log('   ds-full dsh:native vs dsh:native-terse: identical treatment, so any gap is noise.')
console.log('='.repeat(88))
{
  const byRun = gw('results/gateway.jsonl')
  const R = runs('results/ds-full/runs.jsonl')
  const card = PRICES['deepseek-flash']
  const acc = {}
  for (const r of R) {
    if (r.arm !== 'dsh:native' && r.arm !== 'dsh:native-terse') continue
    if (classifyRun(r).infrastructure) continue
    const rs = byRun.get(r.runId) ?? []
    if (!rs.length) continue
    const e = acc[r.arm] = acc[r.arm] ?? { n: 0, billed: 0, inTok: 0, outTok: 0, fresh: 0, hit: 0, created: 0 }
    e.n++
    for (const q of rs) {
      const u = q.usage ?? {}
      const h = u.cacheHitTokens ?? 0, m = u.cacheMissTokens ?? Math.max(0, (u.inputTokens ?? 0) - h), c = u.cacheCreationTokens ?? 0
      // f = m, NOT max(0, m - c): the token buckets are disjoint.
      const f = m
      e.fresh += f; e.created += c; e.hit += h; e.outTok += u.outputTokens ?? 0
      e.inTok += (u.inputTokens ?? 0)
      e.billed += (f / 1e6) * card.miss + (c / 1e6) * (card.write ?? card.miss) + (h / 1e6) * card.hit + ((u.outputTokens ?? 0) / 1e6) * card.out
    }
  }
  const A = acc['dsh:native'], B = acc['dsh:native-terse']
  const pct = (a, b) => ((b - a) / a * 100)
  console.log('  ' + 'measure'.padEnd(26) + 'dsh:native'.padStart(15) + 'dsh:native-terse'.padStart(19) + '  difference')
  for (const [label, ka] of [['cost_billed per run', 'billed'], ['total input tokens/run', 'inTok'], ['output tokens/run', 'outTok'], ['fresh (uncached) per run', 'fresh'], ['cache hit tokens/run', 'hit']]) {
    const a = A[ka] / A.n, b = B[ka] / B.n
    const shown = ka === 'billed' ? '$' + a.toFixed(5) : Math.round(a).toLocaleString()
    const shownB = ka === 'billed' ? '$' + b.toFixed(5) : Math.round(b).toLocaleString()
    console.log('  ' + label.padEnd(26) + shown.padStart(15) + shownB.padStart(19) + ('  ' + (pct(a, b) >= 0 ? '+' : '') + pct(a, b).toFixed(1) + '%').padStart(14))
  }
  console.log('  n = ' + A.n + ' vs ' + B.n + ' runs')
  console.log('')
  console.log('  READ: if the token columns are near zero but cost_billed is +7.7%, the gap is the')
  console.log('  price card meeting slightly different cache splits, not more work. If the token')
  console.log('  columns themselves move, it is usage noise.')
}

console.log('')
console.log('='.repeat(88))
console.log('2. F37 - are the cache hits INTRA-run (the field working) or CROSS-run (other runs warming)?')
console.log('='.repeat(88))
for (const [tag, conds] of [['haiku', ['none', 'static', 'auto']], ['sonnet', ['none', 'static', 'auto']]]) {
  console.log('')
  console.log('  --- ' + tag + ' ---')
  console.log('  ' + 'condition'.padEnd(10) + 'runs'.padStart(6) + 'runs whose FIRST req had hits'.padStart(32) + 'first-req hit tok'.padStart(18) + 'later-req hit tok'.padStart(19) + 'intra-run share'.padStart(17))
  for (const c of conds) {
    const p = tag === 'haiku' ? 'results/cacheab-' + c + '-gateway.jsonl' : 'results/cacheab-' + tag + '-' + c + '-gateway.jsonl'
    const byRun = gw(p)
    let n = 0, firstHasHit = 0, firstHitTok = 0, laterHitTok = 0
    for (const [, rs] of byRun) {
      // Only agent turns. Each DSH run opens with internal calls that carry no tools and, on
      // Sonnet, are rejected outright; treating one of those as "the first request" measures the
      // warm-up rather than the run.
      const ok = rs.filter((q) => Number(q.status) < 400 && (q.bodyKeys ?? []).includes('tools'))
      if (!ok.length) continue
      n++
      const h = (q) => q.usage?.cacheHitTokens ?? 0
      if (h(ok[0]) > 0) { firstHasHit++; firstHitTok += h(ok[0]) }
      for (const q of ok.slice(1)) laterHitTok += h(q)
    }
    const total = firstHitTok + laterHitTok
    console.log('  ' + c.padEnd(10) + String(n).padStart(6) + (firstHasHit + ' (' + (n ? (100 * firstHasHit / n).toFixed(0) : 0) + '%)').padStart(32) +
      firstHitTok.toLocaleString().padStart(18) + laterHitTok.toLocaleString().padStart(19) +
      (total ? (100 * laterHitTok / total).toFixed(1) + '%' : '-').padStart(17))
  }
}

console.log('')
console.log('='.repeat(88))
console.log('3. Anthropic minimum cacheable prefix - is any arm below the floor?')
console.log('='.repeat(88))
for (const [tag, cond] of [['haiku', 'static'], ['sonnet', 'static']]) {
  const p = tag === 'haiku' ? 'results/cacheab-' + cond + '-gateway.jsonl' : 'results/cacheab-' + tag + '-' + cond + '-gateway.jsonl'
  const byRun = gw(p)
  const byArm = new Map()
  for (const [rid, rs] of byRun) {
    // The cacheable prefix is what the first AGENT TURN offers - system + tool schemas, before
    // any conversation. The run's opening internal calls carry no tools and are 150-200 tokens,
    // which is below every provider's cache floor and would report a confound that is not there.
    const ok = rs.filter((q) => Number(q.status) < 400 && (q.bodyKeys ?? []).includes('tools'))
    if (!ok.length) continue
    const first = ok[0]
    const prefix = (first.usage?.inputTokens ?? 0)
    const arm = String(rid).replace(/^[^-]+-dsh-/, '').replace(/-s\d+$/, '')
    if (!byArm.has(arm)) byArm.set(arm, [])
    byArm.get(arm).push(prefix)
  }
  const floor = tag === 'haiku' ? 4096 : 512
  const all = [...byArm.values()].flat()
  const lo = Math.min(...all), hi = Math.max(...all)
  const below = [...byArm].filter(([, xs]) => xs.some((x) => x < floor)).map(([a]) => a)
  console.log('  ' + tag.padEnd(8) + 'floor ' + String(floor).padStart(5) + '   first-agent-turn input ranges ' +
    lo.toLocaleString() + ' - ' + hi.toLocaleString() + '   arms below the floor: ' + (below.length ? below.join(', ') : 'NONE'))
  if (below.length) for (const a of below) console.log('      *** ' + a + ' is below the floor and cannot cache under any condition')
}
