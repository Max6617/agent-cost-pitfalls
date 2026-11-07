/**
 * prefix-retention.mjs - the cache-prefix mechanism test of notes/plans/JOURNAL-PLAN.md section 4.
 *
 * THE HYPOTHESIS (as filed). "The provider cache is a prefix match. In PTC mode the model emits one
 * run_code block whose shape repeats turn after turn; in native mode it emits a sequence of
 * differently-shaped tool calls. Variation INSIDE the re-sent history lands after the cached
 * prefix, so each shape change forces a re-read of everything downstream."
 *
 * WHAT CAN ACTUALLY BE MEASURED HERE. The gateway logs store each request's token counts, byte
 * size, hash, message COUNT and tool COUNT - but not the messages, and not the tool calls. So the
 * shape of the appended turn is not observable, and the filed predictions cannot all be tested:
 *
 *   P1 "PTC's per-step prefix grows more monotonically than native's"
 *      -> REFUTED AS STATED, and this tool reports it: the request body grows monotonically in
 *         84.0% of transitions (mean over runs) on the surviving matrices, in BOTH modes (this
 *         comment said "100% in every arm class" until 2026-10-10; that is not what the tool
 *         computes, and 77% appeared in notes/records/STEP2-RECONCILIATION.md - the filed number is 84.0%,
 *         analysis/prefix-retention.json meanGrowthFraction). Both modes append.
 *         The hypothesis is about the CONTENT of what is appended, which is not logged.
 *   P2 "cache-miss tokens concentrate immediately after a tool-shape change"
 *      -> the shape change is not observable. What IS observable is its consequence, and that is
 *         what this tool measures: RETENTION - of the prefix that was cached before, how much is
 *         still cached on the next request.
 *   P3 "the gap shrinks on tasks with few distinct tools, widens with tool diversity"
 *      -> NOT TESTABLE HERE: the tool count per request is constant within a harness.
 *
 * SO THE MEASURABLE CLAIM IS THE ONE THAT MATTERS. If the mechanism is a prefix effect, the
 * presentation mode must change RETENTION, and the change must track the cost differential's SIGN
 * per provider. That is what this tool tests, on all four matrices that survive.
 *
 * THE METRIC. For each run, the requests in time order. A request is a CONTINUATION when it
 * carries at least half of the largest prompt seen so far in that run (structural: see
 * prefix-retention.test.mjs for why no single field works across providers). For each
 * continuation, retention = cacheHit(i) / (largest prompt before i), clamped to [0, 1]: of
 * everything that was cached before this turn, how much did the provider still serve from cache.
 *
 * Usage: node tools/prefix-retention.mjs [--json analysis/prefix-retention.json]
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { buildPanel, summarise, mean } from './cost-panel.mjs'
import { bootstrapTaskMean } from './stats.mjs'
import { afterCutoff } from './study-window.mjs'

// Records excluded because they post-date a CLOSED matrix's cut-off. Module-level on purpose: the
// join counts them and the report reads them, and a function-local counter lost the count once
// already (notes/defects/EVIDENCE-DRIFT-2026-10-04.md).
let postCutoff = 0

/** A continuation carries at least this share of the prefix it continues. */
export const MIN_PREFIX_SHARE = 0.5

export function armClass(arm) {
  if (arm === 'dsh:ptc') return 'ptc'
  if (arm === 'dsh:native') return 'native'
  return 'external'
}

/**
 * Retention per genuine continuation: cacheHit(i) / (largest input before i), clamped to [0,1].
 *
 * Requests that are not continuations - DSH's auxiliary call, a retry, a fresh conversation -
 * contribute NOTHING: they neither produce a transition nor move the running prefix. Without that
 * rule the auxiliary call's ~50-token prompt becomes a denominator and retention reads 5.18.
 */
export function retentionSequence(reqs) {
  const out = []
  let prefixMax = 0
  for (let i = 0; i < reqs.length; i++) {
    const inp = reqs[i]?.usage?.inputTokens ?? 0
    if (i > 0 && prefixMax > 0 && inp >= MIN_PREFIX_SHARE * prefixMax) {
      const hit = reqs[i]?.usage?.cacheHitTokens ?? 0
      out.push(Math.min(1, hit / prefixMax))
    }
    if (inp > prefixMax) prefixMax = inp
  }
  return out
}

/** Fraction of transitions whose request body is larger than the one before it. */
export function growthFraction(reqs) {
  let grow = 0
  for (let i = 1; i < reqs.length; i++) if ((reqs[i].requestBytes ?? 0) > (reqs[i - 1].requestBytes ?? 0)) grow++
  return reqs.length > 1 ? grow / (reqs.length - 1) : 0
}

/** Keep only tasks where BOTH presentation arms were measured - the comparison is paired. */
export function pairByTask(rows) {
  const byTask = new Map()
  for (const r of rows) {
    if (!byTask.has(r.task)) byTask.set(r.task, {})
    byTask.get(r.task)[r.cls] = r.value
  }
  const pairs = []
  for (const [task, e] of byTask) if (e.ptc != null && e.native != null) pairs.push({ task, ptc: e.ptc, native: e.native })
  return pairs
}

/**
 * The retention difference WITH an interval, on the pairing the tool's own label claims.
 *
 * WHY THIS EXISTS. `pairByTask` assigns `byTask.get(task)[cls] = value`, so with two seeds per
 * (task, class) the LAST row read wins and one seed is silently discarded. The filed table is that
 * last-seed estimate and it carries no interval of any kind. This function averages the seeds per
 * (task, class) first, then bootstraps the per-task differences with the same task-cluster bootstrap
 * the paper uses for every cost contrast (tools/stats.mjs). It is additive: the filed JSON is
 * untouched, and this is written to its own path with `--ci-json`.
 */
export function pairedRetentionCI(rows, { iters = 200000, seed = 12345 } = {}) {
  const models = [...new Set(rows.map((r) => r.model))]
  const out = []
  for (const m of models) {
    const rs = rows.filter((r) => r.model === m && (r.cls === 'ptc' || r.cls === 'native'))
    const byTask = new Map()
    for (const r of rs) {
      const e = byTask.get(r.task) ?? {}
      if (e[r.cls] === undefined) e[r.cls] = []
      e[r.cls].push(r.meanRetention)
      byTask.set(r.task, e)
    }
    const pairs = []
    for (const [task, e] of byTask) if (e.ptc && e.native) pairs.push({ task, ptc: mean(e.ptc), native: mean(e.native) })
    if (!pairs.length) continue
    const d = new Map(pairs.map((p) => [p.task, p.ptc - p.native]))
    const ci = bootstrapTaskMean(d, { iters, seed })
    // The filed estimate, kept beside the both-seeds one so the difference is visible rather than argued.
    const lastSeed = pairByTask(rs.map((r) => ({ task: r.task, cls: r.cls, value: r.meanRetention })))
    out.push({
      model: m, tasks: pairs.length,
      retentionPtc: mean(pairs.map((p) => p.ptc)), retentionNative: mean(pairs.map((p) => p.native)),
      diff: mean([...d.values()]), ciLo: ci.lo, ciHi: ci.hi, iters: ci.iters, seed,
      lastSeedPairing: { tasks: lastSeed.length, diff: mean(lastSeed.map((p) => p.ptc - p.native)) },
    })
  }
  return out
}

/**
 * Per-ARM retention with a task-cluster interval - the statistic the Anthropic-native pilot needs.
 *
 * The study's own contrast is ptc against native within one model; in the pilot each HARNESS is its
 * own arm, and the cluster that matters is the task (one value per task per harness: the mean over
 * that harness's seeds). Uses the same task-cluster percentile bootstrap as every other interval in
 * this study (tools/stats.mjs bootstrapTaskMean). No new estimator.
 */
export function perArmRetention(rows, { iters = 200000, seed = 12345 } = {}) {
  const arms = [...new Set(rows.map((r) => r.arm))].sort()
  const out = []
  for (const arm of arms) {
    const byTask = new Map()
    for (const r of rows.filter((x) => x.arm === arm)) {
      const e = byTask.get(r.task) ?? []
      e.push(r.meanRetention)
      byTask.set(r.task, e)
    }
    const d = new Map([...byTask].map(([task, xs]) => [task, mean(xs)]))
    const n = rows.filter((x) => x.arm === arm).length
    if (d.size < 2) { out.push({ arm, tasks: d.size, runs: n, meanRetention: d.size ? mean([...d.values()]) : null, ciLo: null, ciHi: null, iters, seed }); continue }
    const ci = bootstrapTaskMean(d, { iters, seed })
    out.push({ arm, tasks: d.size, runs: n, meanRetention: mean([...d.values()]), ciLo: ci.lo, ciHi: ci.hi, iters, seed })
  }
  return out
}

// ---- analysis --------------------------------------------------------------------------------
function loadRuns(path) {
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8').split('\n').filter((l) => l.trim())
    .map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
}

export const RETENTION_DATASETS = ['ds-full', 'glm-flash', 'luna-full', 'qwen-full', 'haiku-full', 'sonnet-full']

/**
 * `datasets` is additive and optional: the study's six batch-1 directories are the default, so the
 * filed analysis/prefix-retention.json regenerates byte-identically. The Anthropic-native retention
 * pilot passes its own directory (see tools/retention-pilot-analysis.mjs) instead of editing the
 * study list.
 */
export function analyse({ verbose = false, datasets = RETENTION_DATASETS } = {}) {
  const DATASETS = datasets
  const runIndex = new Map()
  for (const id of DATASETS) {
    for (const r of loadRuns('results/' + id + '/runs.jsonl')) {
      if (r.runId) runIndex.set(r.runId, { dataset: id, model: r.model, task: r.task, arm: r.arm, seed: r.seed })
    }
  }
  const byRun = new Map()
  const gws = readdirSync('results').filter((f) => /gateway.*\.jsonl$/.test(f) && !/selftest/.test(f))
  for (const f of gws) {
    for (const line of readFileSync('results/' + f, 'utf8').split('\n')) {
      if (!line.trim()) continue
      let o; try { o = JSON.parse(line) } catch { continue }
      if (!o.usage || (o.usage.inputTokens ?? 0) === 0) continue
      if (!runIndex.has(o.runId)) continue
      if (afterCutoff(runIndex.get(o.runId).dataset, o.ts)) { postCutoff++; continue }
      if (!byRun.has(o.runId)) byRun.set(o.runId, [])
      byRun.get(o.runId).push(o)
    }
  }
  const rows = []
  let growthSum = 0, growthN = 0
  for (const [runId, reqs] of byRun) {
    const meta = runIndex.get(runId)
    reqs.sort((a, b) => String(a.ts).localeCompare(String(b.ts)))
    const ret = retentionSequence(reqs)
    const g = growthFraction(reqs)
    growthSum += g; growthN++
    if (!ret.length) continue
    rows.push({ ...meta, cls: armClass(meta.arm), requests: reqs.length, continuations: ret.length,
      meanRetention: mean(ret), fracHighRetention: ret.filter((x) => x >= 0.99).length / ret.length })
  }
  return { rows, gatewayLogs: gws.length, meanGrowth: growthN ? growthSum / growthN : null }
}

function main() {
  const { rows, gatewayLogs, meanGrowth } = analyse({ verbose: true })
  console.log('PREFIX-RETENTION - does the presentation mode change what stays cached?\n')
  console.log('  hypothesis (notes/plans/JOURNAL-PLAN.md section 4): the cache is a prefix match, and a shape')
  console.log('  change inside the re-sent history forces a re-read of everything downstream.')
  console.log('  metric: retention = cacheHit(i) / largest prompt before i, over genuine continuations.')
  console.log('  source: ' + gatewayLogs + ' gateway logs, joined to the four surviving matrices by runId.')
  if (postCutoff) console.log('  cut-off: ' + postCutoff + ' record(s) excluded as post-sign-off drift (notes/defects/EVIDENCE-DRIFT-2026-10-04.md)')
  console.log('')
  console.log('  P1 first, because it is a REFUTATION: the request body grows monotonically in ' +
    (meanGrowth * 100).toFixed(1) + '% of transitions (mean over runs).')
  console.log('     Both modes APPEND; the hypothesis is about the content of what is appended, and')
  console.log('     these logs store message and tool COUNTS, not contents. P1 as filed is not supported.')
  console.log('')
  console.log('  ' + 'model'.padEnd(20) + 'class'.padEnd(10) + 'runs'.padStart(5) + 'cont'.padStart(7) + 'meanRet'.padStart(9) + 'frac>=0.99'.padStart(11))
  const models = [...new Set(rows.map((r) => r.model))]
  const agg = {}
  for (const m of models) {
    for (const cls of ['ptc', 'native', 'external']) {
      const rs = rows.filter((r) => r.model === m && r.cls === cls)
      if (!rs.length) continue
      const cont = rs.reduce((s, r) => s + r.continuations, 0)
      const mr = rs.reduce((s, r) => s + r.meanRetention * r.continuations, 0) / cont
      const fh = rs.reduce((s, r) => s + r.fracHighRetention * r.continuations, 0) / cont
      agg[m + '|' + cls] = { runs: rs.length, cont, meanRetention: mr, fracHigh: fh }
      console.log('  ' + (cls === 'ptc' ? m : '').padEnd(20) + cls.padEnd(10) + String(rs.length).padStart(5) +
        String(cont).padStart(7) + mr.toFixed(3).padStart(9) + (fh * 100).toFixed(1).padStart(10) + '%')
    }
  }
  console.log('')
  console.log('  PAIRED BY TASK (ptc vs native, same model, same task - the A2 pairing)')
  console.log('  ' + 'model'.padEnd(20) + 'tasks'.padStart(6) + 'ret ptc'.padStart(9) + 'ret native'.padStart(11) + 'diff'.padStart(8) + '  ptc higher in')
  const link = []
  const panel = buildPanel().panel
  for (const m of models) {
    const rs = rows.filter((r) => r.model === m && (r.cls === 'ptc' || r.cls === 'native'))
    const pairs = pairByTask(rs.map((r) => ({ task: r.task, cls: r.cls, value: r.meanRetention })))
    if (!pairs.length) continue
    const mp = mean(pairs.map((p) => p.ptc)), mn = mean(pairs.map((p) => p.native))
    const higher = pairs.filter((p) => p.ptc > p.native).length
    // the billed and cold PTC differential, for the sign comparison
    const diff = (pick) => {
      const byTask = new Map()
      for (const r of panel.filter((x) => x.model === m && (x.arm === 'dsh:native' || x.arm === 'dsh:ptc'))) {
        const e = byTask.get(r.task) ?? { n: [], p: [] }
        ;(r.arm === 'dsh:native' ? e.n : e.p).push(pick(r))
        byTask.set(r.task, e)
      }
      const d = [...byTask.values()].filter((e) => e.n.length && e.p.length).map((e) => mean(e.p) - mean(e.n))
      const base = summarise(panel).find((r) => r.model === m && r.arm === 'dsh:native')
      return mean(d) / pick({ costBilled: base.billed, costCold: base.cold }) * 100
    }
    console.log('  ' + m.padEnd(20) + String(pairs.length).padStart(6) + mp.toFixed(3).padStart(9) + mn.toFixed(3).padStart(11) +
      (mp - mn >= 0 ? '+' : '') + (mp - mn).toFixed(3).padStart(7) + '  ' + higher + '/' + pairs.length)
    link.push({ model: m, tasks: pairs.length, retentionPtc: mp, retentionNative: mn,
      retentionDiff: mp - mn, billedDiffPct: diff((r) => r.costBilled), coldDiffPct: diff((r) => r.costCold) })
  }
  console.log('')
  console.log('  LINK TO COST - does retention explain the PTC differential, per provider?')
  console.log('  PREDICTION: PTC retaining LESS of the prefix means more tokens re-read at the miss')
  console.log('  price, so the retention difference and the billed differential must have OPPOSITE')
  console.log('  signs. A provider with a LARGE billed differential and a negligible retention')
  console.log('  difference is a COUNTEREXAMPLE: something other than the cache is moving its cost.')
  console.log('  ' + 'model'.padEnd(20) + 'ret diff'.padStart(9) + 'PTC billed'.padStart(12) + 'PTC cold'.padStart(10) + '   verdict')
  for (const l of link) {
    const DEAD = 0.005
    let verdict
    if (Math.abs(l.retentionDiff) < DEAD) {
      verdict = Math.abs(l.billedDiffPct) < 5
        ? 'no billed effect; volume ' + (l.coldDiffPct >= 0 ? '+' : '') + l.coldDiffPct.toFixed(1) + '% is cancelled by cache pricing'
        : 'NOT retention (ret diff ~0); volume moves it: cold ' + (l.coldDiffPct >= 0 ? '+' : '') + l.coldDiffPct.toFixed(1) + '%'
    } else {
      verdict = Math.sign(l.billedDiffPct) === -Math.sign(l.retentionDiff) ? 'retention explains it' : 'retention predicts the WRONG sign'
    }
    console.log('  ' + l.model.padEnd(20) + (l.retentionDiff >= 0 ? '+' : '') + l.retentionDiff.toFixed(3).padStart(8) +
      ((l.billedDiffPct >= 0 ? '+' : '') + l.billedDiffPct.toFixed(1) + '%').padStart(12) +
      ((l.coldDiffPct >= 0 ? '+' : '') + l.coldDiffPct.toFixed(1) + '%').padStart(10) + '   ' + verdict)
    l.verdict = verdict
  }
  const explained = link.filter((l) => l.verdict === 'retention explains it').length
  console.log('  -> the prefix mechanism explains ' + explained + ' of ' + link.length + ' providers.')
  console.log('     The others move on token VOLUME (the cost_cold contrast), which is a different')
  console.log('     mechanism: PTC sends fewer tokens overall, not the same tokens re-read less.')
  console.log('     NOTE ON CIRCULARITY: billed cost is computed FROM hit and miss tokens, so a')
  console.log('     retention difference MECHANICALLY moves it. What is not mechanical is that the')
  console.log('     retention difference is mode-specific, provider-specific, and near zero on three')
  console.log('     of the four providers while their billed differentials are not.')
  console.log('')
  console.log('  NOT TESTABLE FROM THESE LOGS (stated, not skipped): P2 as filed needs tool-call shapes,')
  console.log('  which the gateway does not record; P3 needs per-task tool diversity, and the tool count')
  console.log('  per request is constant within a harness. Both need a re-run with message capture on.')
  const ji = process.argv.indexOf('--json')
  if (ji >= 0) {
    const p = process.argv[ji + 1] ?? 'analysis/prefix-retention.json'
    mkdirSync(p.split(/[\\/]/).slice(0, -1).join('/') || '.', { recursive: true })
    writeFileSync(p, JSON.stringify({ generated: new Date().toISOString(), model: 'prefix-retention',
      meanGrowthFraction: meanGrowth, aggregate: agg, paired: link,
      notTestable: ['P1 as filed (content of the appended turn is not logged; P1 IS refuted as stated)',
        'P2 as filed (tool-call shape is not logged)', 'P3 (per-task tool diversity is not logged)'] }, null, 1))
    console.log('\nwrote ' + p)
  }
  const ci = process.argv.indexOf('--ci-json')
  if (ci >= 0) {
    const p = process.argv[ci + 1] ?? 'analysis/prefix-retention-ci.json'
    const table = pairedRetentionCI(rows)
    console.log('')
    console.log('  RETENTION DIFFERENCE WITH AN INTERVAL, seeds averaged per (task, class)')
    console.log('  ' + 'model'.padEnd(20) + 'tasks'.padStart(6) + 'ret ptc'.padStart(9) + 'ret native'.padStart(11) + 'diff'.padStart(9) +
      '   95% CI (cluster bootstrap over tasks)'.padStart(40) + '  filed last-seed'.padStart(18))
    for (const r of table) {
      console.log('  ' + r.model.padEnd(20) + String(r.tasks).padStart(6) + r.retentionPtc.toFixed(3).padStart(9) +
        r.retentionNative.toFixed(3).padStart(11) + (r.diff >= 0 ? '+' : '') + r.diff.toFixed(4).padStart(8) +
        ('   [' + (r.ciLo >= 0 ? '+' : '') + r.ciLo.toFixed(4) + ', ' + (r.ciHi >= 0 ? '+' : '') + r.ciHi.toFixed(4) + ']').padStart(40) +
        (r.lastSeedPairing.diff >= 0 ? '+' : '') + r.lastSeedPairing.diff.toFixed(4).padStart(17))
    }
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, JSON.stringify({
      generated: new Date().toISOString(),
      method: 'paired by task, seeds averaged per (task, class), task-cluster percentile bootstrap',
      iters: table[0]?.iters ?? null, seed: table[0]?.seed ?? null,
      note: 'The filed prefix-retention.json uses pairByTask, where the last row read wins and one seed per (task, class) is silently discarded; lastSeedPairing reproduces that estimate for comparison. This file is additive and does not replace the filed one.',
      models: table,
    }, null, 1))
    console.log('')
    console.log('  wrote ' + p)
  }
}

if (process.argv[1] && process.argv[1].endsWith('prefix-retention.mjs')) main()
