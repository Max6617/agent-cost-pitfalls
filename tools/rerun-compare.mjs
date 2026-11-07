/**
 * rerun-compare.mjs - the randomised-order re-run against the filed study (notes/plans/RERUN-PLAN.md section 4).
 *
 * Answers the five pre-registered questions with the study's own estimators (paired by task, seeds
 * averaged, task-clustered percentile bootstrap at B = 200,000, seed 12345, tools/stats.mjs):
 *
 *   Q1  the re-run's raw PTC-vs-native classification beside the filed raw and adjusted ones
 *   Q2  whether the re-run sits closer to the filed ADJUSTED estimate than to the filed RAW one
 *       (holds at >= 5 of the 8 cheap-provider rows, fails at <= 3, inconclusive at 4; Haiku is
 *       reported, not counted, because the filing names 8 rows)
 *   Q3  the order effect measured directly: the contrast in PTC-led blocks minus native-led blocks
 *   Q4  quality: tools/quality-guard.mjs guardModel on every re-run matrix
 *   Q5  the interleaved A/A: the difference between the identical copies (the floor) and the
 *       difference between whichever copy ran second and whichever ran first (carry-over)
 *
 * plus the drift check of section 6: the re-run's native-arm mean cost against the filed one.
 *
 * Usage: node tools/rerun-compare.mjs [--json analysis/rerun-compare-<date>.json] [--iters 200000]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { buildPanel, SUITES, MODELS, mean } from './cost-panel.mjs'
import { clusterBootstrap, bootstrapTaskMean } from './stats.mjs'
import { guardModel } from './quality-guard.mjs'
import { registerRerun, ORIGINAL_SUITE } from './rerun-datasets.mjs'

export const NATIVE = 'dsh:native'
export const PTC = 'dsh:ptc'
export const TWIN = 'dsh:native-twin'
export const FILED = {
  batch1: 'analysis/position-adjust-6model-2026-10-09.json',
  batchb: 'analysis/position-adjust-batchb-2026-10-09.json',
}
const CHEAP = ['deepseek-flash', 'glm-5.3-flash', 'qwen3.8-flash', 'gpt-6-luna']

export function classify (lo, hi) {
  return lo > 0 ? 'positive' : hi < 0 ? 'negative' : 'null'
}

/** Per task, the mean over seeds of (b - a); the panel A2 convention (cost-panel pairedDiffs). */
function perTaskDiffs (rows, a, b) {
  const byTask = new Map()
  for (const r of rows) {
    if (r.arm !== a && r.arm !== b) continue
    const e = byTask.get(r.task) ?? { a: [], b: [] }
    ;(r.arm === a ? e.a : e.b).push(r.costBilled)
    byTask.set(r.task, e)
  }
  const d = new Map()
  for (const [t, e] of byTask) if (e.a.length && e.b.length) d.set(t, mean(e.b) - mean(e.a))
  return d
}

/** Raw contrast b vs a as a percent of a's mean: the A2 convention. */
export function contrast (rows, { a = NATIVE, b = PTC, iters = 200000, seed = 12345 } = {}) {
  const d = perTaskDiffs(rows, a, b)
  const base = mean(rows.filter((r) => r.arm === a).map((r) => r.costBilled))
  const ci = bootstrapTaskMean(d, { iters, seed })
  const pct = (mean([...d.values()]) / base) * 100
  const lo = (ci.lo / base) * 100, hi = (ci.hi / base) * 100
  return { tasks: d.size, nativeMean: base, pct, ciLoPct: lo, ciHiPct: hi, cls: classify(lo, hi), iters, seed }
}

/** (task, seed) blocks carrying both arms, with which arm led (position 0). */
function blocks (rows, a, b) {
  const m = new Map()
  for (const r of rows) {
    if (r.arm !== a && r.arm !== b) continue
    const k = r.task + '|' + r.seed
    const e = m.get(k) ?? { task: r.task, seed: r.seed }
    e[r.arm === a ? 'a' : 'b'] = r
    m.set(k, e)
  }
  return [...m.values()].filter((e) => e.a && e.b && e.a.position != null && e.b.position != null)
}

/**
 * Q3: mean (ptc - native) in PTC-led blocks minus the same in native-led blocks, as a percent of the
 * native mean, with a task-clustered bootstrap. Counterbalancing makes the two block types equally
 * common within each matrix, so this is the order effect on the contrast itself.
 */
export function orderEffect (rows, { a = NATIVE, b = PTC, iters = 200000, seed = 12345 } = {}) {
  const bl = blocks(rows, a, b).map((e) => ({ task: e.task, d: e.b.costBilled - e.a.costBilled, bLed: e.b.position === 0 }))
  const base = mean(rows.filter((r) => r.arm === a).map((r) => r.costBilled))
  const stat = (draw) => {
    const x = draw.filter((e) => e.bLed).map((e) => e.d), y = draw.filter((e) => !e.bLed).map((e) => e.d)
    return x.length && y.length ? mean(x) - mean(y) : NaN
  }
  const ci = clusterBootstrap(bl, stat, { iters, seed })
  return {
    blocksPtcFirst: bl.filter((e) => e.bLed).length, blocksNativeFirst: bl.filter((e) => !e.bLed).length,
    pct: (stat(bl) / base) * 100, ciLoPct: (ci.lo / base) * 100, ciHiPct: (ci.hi / base) * 100, iters, seed,
  }
}

/** Q2's filed decision rule over the 8 cheap-provider (model, suite) rows. */
export function q2Verdict (rows) {
  if (rows.length !== 8) throw new Error('Q2 is filed over 8 rows (four cheap providers x two suites), got ' + rows.length)
  const closer = rows.filter((r) => Math.abs(r.rerun - r.adjustedLog) < Math.abs(r.rerun - r.raw)).length
  return { closerToAdjusted: closer, rows: rows.length, verdict: closer >= 5 ? 'holds' : closer <= 3 ? 'fails' : 'inconclusive' }
}

const hitShare = (rs) => {
  const hit = rs.reduce((s, r) => s + r.hit, 0), all = rs.reduce((s, r) => s + r.hit + r.fresh + r.created, 0)
  return all ? hit / all : null
}

/** Q5: the identical copies' difference (the floor) and second-minus-first (carry-over). */
export function aaSummary (rows, { iters = 200000, seed = 12345 } = {}) {
  const label = contrast(rows, { a: NATIVE, b: TWIN, iters, seed })
  const bl = blocks(rows, NATIVE, TWIN).map((e) => {
    const [first, second] = e.a.position === 0 ? [e.a, e.b] : [e.b, e.a]
    return { task: e.task, d: second.costBilled - first.costBilled }
  })
  const base = mean(rows.map((r) => r.costBilled))
  const byTask = new Map()
  for (const e of bl) { const v = byTask.get(e.task) ?? []; v.push(e.d); byTask.set(e.task, v) }
  const d = new Map([...byTask].map(([t, v]) => [t, mean(v)]))
  const ci = bootstrapTaskMean(d, { iters, seed })
  const carryOver = { pct: (mean([...d.values()]) / base) * 100, ciLoPct: (ci.lo / base) * 100, ciHiPct: (ci.hi / base) * 100 }
  const hits = { native: hitShare(rows.filter((r) => r.arm === NATIVE)), twin: hitShare(rows.filter((r) => r.arm === TWIN)) }
  return {
    label: { ...label, halfWidthPct: (label.ciHiPct - label.ciLoPct) / 2 },
    carryOver, hitShare: hits,
    prediction: {
      labelWithin2pct: Math.abs(label.pct) <= 2,
      hitSharesWithin1pt: hits.native != null && hits.twin != null && Math.abs(hits.native - hits.twin) < 0.01,
    },
  }
}

/** Section 6: the re-run native arm's mean cost against the filed native mean. */
export function drift (rows, filedNativeMean) {
  const m = mean(rows.filter((r) => r.arm === NATIVE).map((r) => r.costBilled))
  return { rerunNativeMean: m, filedNativeMean, pct: (m / filedNativeMean - 1) * 100 }
}

export function compare ({ iters = 200000, seed = 12345 } = {}) {
  registerRerun()
  const out = { suites: {}, q2: null, aa: null, missing: [] }
  const q2rows = []
  for (const suite of ['rerun-b1', 'rerun-b']) {
    const filed = JSON.parse(readFileSync(FILED[ORIGINAL_SUITE[suite]], 'utf8'))
    const { panel, missing } = buildPanel({ datasets: SUITES[suite] })
    out.missing.push(...missing)
    const rows = []
    for (const model of [...new Set(panel.map((r) => r.model))]) {
      const mine = panel.filter((r) => r.model === model)
      const f = filed.models.find((m) => m.model === model)
      if (!f) continue
      const c = contrast(mine, { iters, seed })
      const row = {
        model, label: MODELS[model]?.label ?? model,
        rerun: c,
        filedRaw: { pct: f.raw.pct, ciLoPct: f.raw.ciLoPct, ciHiPct: f.raw.ciHiPct, cls: classify(f.raw.ciLoPct, f.raw.ciHiPct) },
        filedAdjustedLog: { pct: f.adjustedLog.pct, ciLoPct: f.adjustedLog.ciLoPct, ciHiPct: f.adjustedLog.ciHiPct, cls: classify(f.adjustedLog.ciLoPct, f.adjustedLog.ciHiPct) },
        filedAdjustedAdditive: { pct: f.adjustedUsd.pct, ciLoPct: f.adjustedUsd.ciLoPct, ciHiPct: f.adjustedUsd.ciHiPct, cls: classify(f.adjustedUsd.ciLoPct, f.adjustedUsd.ciHiPct) },
        orderEffect: orderEffect(mine, { iters, seed }),
        quality: guardModel(mine, { iters, seed }),
        drift: drift(mine, f.raw.nativeMean),
      }
      rows.push(row)
      if (CHEAP.includes(model)) q2rows.push({ suite, model, rerun: c.pct, raw: f.raw.pct, adjustedLog: f.adjustedLog.pct })
    }
    out.suites[suite] = rows
  }
  out.q2 = q2rows.length === 8 ? { ...q2Verdict(q2rows), detail: q2rows } : { verdict: 'not computable', rowsAvailable: q2rows.length, detail: q2rows }
  const aa = buildPanel({ datasets: SUITES['rerun-aa'] })
  out.missing.push(...aa.missing)
  out.aa = aa.panel.length ? aaSummary(aa.panel, { iters, seed }) : null
  return out
}

if (process.argv[1] && process.argv[1].endsWith('rerun-compare.mjs')) {
  const argv = process.argv.slice(2)
  const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d)
  const r = compare({ iters: Number(arg('--iters', 200000)) })
  const f = (v, d = 1) => (v >= 0 ? '+' : '') + v.toFixed(d)
  if (r.missing.length) console.log('not yet collected: ' + r.missing.join(', ') + '\n')
  for (const [suite, rows] of Object.entries(r.suites)) {
    if (!rows.length) continue
    console.log(suite + ' (re-run raw | filed raw | filed adjusted log | filed adjusted additive)')
    for (const x of rows) {
      console.log('  ' + x.label.padEnd(20) + (f(x.rerun.pct) + '% ' + x.rerun.cls).padEnd(18) + (f(x.filedRaw.pct) + '% ' + x.filedRaw.cls).padEnd(18) +
        (f(x.filedAdjustedLog.pct) + '% ' + x.filedAdjustedLog.cls).padEnd(18) + f(x.filedAdjustedAdditive.pct) + '% ' + x.filedAdjustedAdditive.cls)
      console.log('    Q3 order effect ' + f(x.orderEffect.pct) + '% [' + f(x.orderEffect.ciLoPct) + ', ' + f(x.orderEffect.ciHiPct) + ']' +
        '   Q4 solved ' + x.quality.native.solved + '/' + x.quality.ptc.solved + ' McNemar p=' + x.quality.mcnemar.p.toPrecision(2) +
        '   drift (native) ' + f(x.drift.pct) + '%')
    }
  }
  console.log('\nQ2: ' + r.q2.verdict + (r.q2.closerToAdjusted != null ? ' (' + r.q2.closerToAdjusted + ' of 8 rows closer to the adjusted estimate)' : ''))
  if (r.aa) {
    console.log('Q5 A/A: copies differ ' + f(r.aa.label.pct, 2) + '% [' + f(r.aa.label.ciLoPct, 2) + ', ' + f(r.aa.label.ciHiPct, 2) + '], half-width ' +
      r.aa.label.halfWidthPct.toFixed(2) + '%; carry-over (second - first) ' + f(r.aa.carryOver.pct, 2) + '%; hit share ' +
      (r.aa.hitShare.native * 100).toFixed(1) + '% / ' + (r.aa.hitShare.twin * 100).toFixed(1) + '%')
  }
  const jsonPath = arg('--json', null)
  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true })
    writeFileSync(jsonPath, JSON.stringify({ generated: new Date().toISOString(), plan: 'RERUN-PLAN.md', ...r }, null, 2) + '\n')
    console.log('\nwrote ' + jsonPath)
  }
}
