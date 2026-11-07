/**
 * ablations.mjs - which arms, seeds, models and providers carry each claim.
 *
 * WHY THIS EXISTS. PAPER.md reports sensitivities (execution order, test editing, Anthropic pricing
 * bounds) but no arm-removal ablations, and a reviewer is entitled to ask which part of the design each
 * claim actually rests on. Four questions, each cheap and each answered from data already on disk:
 *
 *   A. ARM VARIANT   Is the headline PTC penalty a property of code mode, or of one arm string?
 *                    dsh:ptc vs dsh:native is one pair; dsh:ptc-opt vs dsh:native-opt is a second
 *                    contrast with the same manipulation and different prompt suffixes.
 *   B. SEED SPLIT    Is any claim carried by one of the two seeds?
 *   C. RANKING       Is "rankings do not transfer" driven by one model, or by the four external
 *                    harness arms? Reported per suite, because the two suites disagree.
 *   D. PROVIDER      Is the one confirmatory win (H3, tool surface costs requests) driven by any
 *                    single provider?
 *
 * NOTHING HERE RECOMPUTES A FILED RULE. The ranking ablations are READINGS of the filed
 * panel-analysis JSON (A1b.correlations, A8.details); the differentials use cost-panel's pairedDiffs
 * and stats' cluster bootstrap, the same estimators A2 uses; and D runs the filed tool
 * (tools/hypotheses.mjs) on restricted selections rather than reimplementing H3.
 *
 * Usage:
 *   node tools/ablations.mjs [--json analysis/ablations-<date>.json]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { buildPanel, summarise, mean, pairedDiffs, MODELS, DATASETS, DEFAULT_DATASETS, BATCHB_DATASETS, selectionFromArgv, refuse, refuseFiledWrite } from './cost-panel.mjs'
import { bootstrapTaskMean } from './stats.mjs'

export const FOUR = ['batchb-deepseek', 'batchb-glm-flash', 'batchb-qwen', 'batchb-luna']

/** Median of a numeric list; null for an empty list (never NaN, which a table would print). */
export function median (xs) {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** A1b correlations with every pair involving `model` removed. */
export function excludeModel (correlations, model) {
  return correlations.filter((c) => c.a !== model && c.b !== model)
}

/**
 * Share of adjacent rank pairs that are statistically indistinguishable.
 * `distinct === false` is the tie; a pair missing the field is not counted either way.
 */
export function tieFraction (details, { models = null, arms = null } = {}) {
  const keep = details.filter((d) => {
    if (models && !models.includes(d.model)) return false
    if (arms && !(arms.includes(d.higher) && arms.includes(d.lower))) return false
    return typeof d.distinct === 'boolean'
  })
  if (!keep.length) return { pairs: 0, ties: 0, fraction: null }
  const ties = keep.filter((d) => d.distinct === false).length
  return { pairs: keep.length, ties, fraction: ties / keep.length }
}

/** One paired differential, the A2 way: mean over seeds per task, bootstrap over tasks. */
export function differential (panel, model, armA, armB) {
  const base = summarise(panel).find((r) => r.model === model && r.arm === armA)
  const d = pairedDiffs(panel, model, armA, armB)
  if (!base || d.size < 2) return null
  const ci = bootstrapTaskMean(d)
  const rel = mean([...d.values()]) / base.billed * 100
  return { tasks: d.size, pct: rel, lo: ci.lo / base.billed * 100, hi: ci.hi / base.billed * 100 }
}

export const classify = (r) => (r == null ? 'n/a' : r.lo > 0 ? 'positive' : r.hi < 0 ? 'negative' : 'null')

/** A and B: the same contrast under a different arm pair, and under each seed alone. */
export function armAndSeedAblations (panel, models) {
  const rows = []
  for (const m of models) {
    const both = differential(panel, m, 'dsh:native', 'dsh:ptc')
    if (!both) continue
    rows.push({
      model: m, label: MODELS[m].label,
      primary: both,
      opt: differential(panel, m, 'dsh:native-opt', 'dsh:ptc-opt'),
      seed1: differential(panel.filter((r) => r.seed === 1), m, 'dsh:native', 'dsh:ptc'),
      seed2: differential(panel.filter((r) => r.seed === 2), m, 'dsh:native', 'dsh:ptc'),
    })
  }
  return rows
}

/** C: the ranking claim, read from a filed panel JSON, under model and arm-set restrictions. */
export function rankingAblations (panelJson, label) {
  const a1b = panelJson.sections.A1b, a8 = panelJson.sections.A8
  if (!a1b || !a8) throw new Error('ablations: ' + label + ' has no A1b/A8 to read')
  const models = [...new Set(a1b.correlations.flatMap((c) => [c.a, c.b]))]
  const dshArms = a1b.cleanArms.filter((a) => a.startsWith('dsh:'))
  const extArms = a1b.cleanArms.filter((a) => !a.startsWith('dsh:'))
  return {
    label,
    overall: { medianRho: median(a1b.correlations.map((c) => c.rho)), pairs: a1b.correlations.length, ties: tieFraction(a8.details) },
    excludingEachModel: models.map((m) => ({
      dropped: MODELS[m] ? MODELS[m].label : m,
      medianRho: median(excludeModel(a1b.correlations, m).map((c) => c.rho)),
      pairs: excludeModel(a1b.correlations, m).length,
      ties: tieFraction(a8.details, { models: models.filter((x) => x !== m) }),
    })),
    dshOnly: tieFraction(a8.details, { arms: dshArms }),
    externalOnly: tieFraction(a8.details, { arms: extArms }),
  }
}

/**
 * D: H3 under a leave-one-group-out, by running the FILED tool on restricted selections.
 *
 * `drops` is a list of {label, ids}: each entry is removed from `datasets` in turn. It is GROUPS
 * rather than single datasets because a MODEL is not a dataset — the batch-1 panel carries four GLM
 * matrices (glm-flash, glm-terse, glm-harness, glm53) under one provider, so "drop GLM" is a four-id
 * drop, and a single-id version would silently leave three quarters of GLM in the sample.
 *
 * Nothing here reimplements H3: hypotheses.mjs is executed with a restricted --datasets selection and
 * its own filed output is read back. A drop whose ids are absent from `datasets` would silently
 * return the full-sample fit, so that is refused rather than reported as a leave-one-out.
 */
export function h3LeaveOneOut (datasets, drops = null, tmpDir = 'results/_scratch') {
  const run = (sel, tag) => {
    const out = tmpDir + '/abl-h3-' + tag + '.json'
    execFileSync('node', ['tools/hypotheses.mjs', '--datasets', sel.join(','), '--json', out], { stdio: 'ignore' })
    const j = JSON.parse(readFileSync(out, 'utf8'))
    return { n: j.sections.H3.n, b1: j.sections.H3.b1Pooled, lo: j.sections.H3.ciPooled.lo, hi: j.sections.H3.ciPooled.hi }
  }
  const spec = drops ?? datasets.map((d) => ({ label: d, ids: [d] }))
  for (const d of spec) {
    if (!d.ids || !d.ids.length) throw new Error('ablations: drop "' + d.label + '" has no dataset ids')
    const missing = d.ids.filter((x) => !datasets.includes(x))
    if (missing.length) throw new Error('ablations: drop "' + d.label + '" names datasets not in the selection: ' + missing.join(', '))
  }
  const all = run(datasets, 'all')
  return { all, dropped: spec.map((d) => ({ dropped: d.label, droppedIds: d.ids, ...run(datasets.filter((x) => !d.ids.includes(x)), d.label.replace(/[^a-z0-9]/gi, '')) })) }
}

/** The batch-1 drops: one group per MODEL, because a provider is not a dataset there. */
export function modelDrops (datasets) {
  const byModel = new Map()
  for (const id of datasets) {
    const d = DATASETS.find((x) => x.id === id)
    if (!d) continue
    if (!byModel.has(d.model)) byModel.set(d.model, [])
    byModel.get(d.model).push(id)
  }
  return [...byModel].map(([model, ids]) => ({ label: (MODELS[model] && MODELS[model].label) || model, ids }))
}

// ---- CLI -------------------------------------------------------------------------------------
if (process.argv[1] && process.argv[1].endsWith('ablations.mjs')) main()

function main () {
  const argv = process.argv.slice(2)
  const panelPath = argv.includes('--panel') ? argv[argv.indexOf('--panel') + 1] : 'analysis/panel-analysis-batchb-2026-10-09.json'
  const batchOnePath = argv.includes('--panel-batch1') ? argv[argv.indexOf('--panel-batch1') + 1] : 'analysis/panel-analysis-6model-2026-10-03.json'
  const out = { generated: new Date().toISOString(), ablations: {} }
  const f = (v) => (v == null ? '  n/a' : (v >= 0 ? '+' : '') + v.toFixed(1) + '%')
  const ci = (r) => (r == null ? '' : '[' + f(r.lo) + ', ' + f(r.hi) + ']')

  const { panel: tb } = buildPanel({ datasets: BATCHB_DATASETS.map((d) => d.id) })
  const { panel: b1 } = buildPanel({ datasets: DEFAULT_DATASETS })
  const modelsTb = Object.keys(MODELS).filter((m) => tb.some((r) => r.model === m))
  const modelsB1 = Object.keys(MODELS).filter((m) => b1.some((r) => r.model === m))

  console.log('ABLATIONS - what each claim rests on. All four read or run tools that already exist.')
  console.log('')
  console.log('A/B  ARM VARIANT and SEED SPLIT - the headline contrast, tasks-b')
  console.log('  ' + 'model'.padEnd(20) + 'native vs ptc'.padStart(24) + 'opt vs ptc-opt'.padStart(24) + 'seed 1'.padStart(22) + 'seed 2'.padStart(22))
  for (const r of armAndSeedAblations(tb, modelsTb)) {
    console.log('  ' + r.label.padEnd(20) +
      (f(r.primary.pct) + ' ' + ci(r.primary)).padStart(24) +
      (r.opt ? f(r.opt.pct) + ' ' + ci(r.opt) : 'n/a').padStart(24) +
      (r.seed1 ? f(r.seed1.pct) + ' ' + ci(r.seed1) : 'n/a').padStart(22) +
      (r.seed2 ? f(r.seed2.pct) + ' ' + ci(r.seed2) : 'n/a').padStart(22))
  }
  out.ablations.armAndSeed = { tasksB: armAndSeedAblations(tb, modelsTb), batch1: armAndSeedAblations(b1, modelsB1) }

  console.log('')
  console.log('  same contrast, batch-1')
  console.log('  ' + 'model'.padEnd(20) + 'native vs ptc'.padStart(24) + 'opt vs ptc-opt'.padStart(24) + 'seed 1'.padStart(22) + 'seed 2'.padStart(22))
  for (const r of out.ablations.armAndSeed.batch1) {
    console.log('  ' + r.label.padEnd(20) +
      (f(r.primary.pct) + ' ' + ci(r.primary)).padStart(24) +
      (r.opt ? f(r.opt.pct) + ' ' + ci(r.opt) : 'n/a').padStart(24) +
      (r.seed1 ? f(r.seed1.pct) + ' ' + ci(r.seed1) : 'n/a').padStart(22) +
      (r.seed2 ? f(r.seed2.pct) + ' ' + ci(r.seed2) : 'n/a').padStart(22))
  }

  console.log('')
  console.log('C  RANKING - is it carried by one model, or by the external arms?')
  const pct = (x) => (x == null ? 'n/a' : (100 * x).toFixed(1) + '%')
  for (const [path, label] of [[batchOnePath, 'batch-1 (6model)'], [panelPath, 'tasks-b']]) {
    let j
    try { j = JSON.parse(readFileSync(path, 'utf8')) } catch { console.log('  ' + label + ': no panel at ' + path); continue }
    const R = rankingAblations(j, label)
    console.log('  ' + label + ': median rho ' + R.overall.medianRho.toFixed(3) +
      '  ties ' + R.overall.ties.ties + '/' + R.overall.ties.pairs + ' (' + pct(R.overall.ties.fraction) + ')' +
      '   DSH-only ' + pct(R.dshOnly.fraction) + '   external-only ' + pct(R.externalOnly.fraction))
    for (const e of R.excludingEachModel) {
      console.log('      drop ' + String(e.dropped).padEnd(20) + 'median rho ' + (e.medianRho == null ? 'n/a' : e.medianRho.toFixed(3)) +
        '  ties ' + e.ties.ties + '/' + e.ties.pairs + ' (' + pct(e.ties.fraction) + ')')
    }
    out.ablations['ranking:' + label] = R
  }

  console.log('')
  console.log('D  H3 (tool surface costs requests) - leave one group out, by running the filed tool')
  const show = (label, h3) => {
    console.log('      ' + label)
    console.log('        all                  n=' + String(h3.all.n).padStart(4) + '  b1 ' + h3.all.b1.toFixed(3) + ' [' + h3.all.lo.toFixed(3) + ', ' + h3.all.hi.toFixed(3) + ']')
    for (const d of h3.dropped) {
      console.log('        drop ' + String(d.dropped).padEnd(19) + 'n=' + String(d.n).padStart(4) + '  b1 ' + d.b1.toFixed(3) + ' [' + d.lo.toFixed(3) + ', ' + d.hi.toFixed(3) + ']' +
        (d.lo > 0 ? '  supported' : '  *** INTERVAL CONTAINS ZERO ***'))
    }
  }
  const h3Tb = h3LeaveOneOut(FOUR)
  show('tasks-b, four pre-registered providers (one dataset each)', h3Tb)
  // THE ONE THAT MATTERS: the batch-1 suite the confirmatory win is actually reported on. A MODEL is
  // four GLM matrices here, not one dataset, so the drops are model groups.
  const h3B1 = h3LeaveOneOut(DEFAULT_DATASETS, modelDrops(DEFAULT_DATASETS))
  show('batch-1, six models (GLM is four matrices)', h3B1)
  out.ablations.h3LeaveOneOut = { tasksB: h3Tb, batch1: h3B1 }

  if (argv.includes('--json')) {
    const p = argv[argv.indexOf('--json') + 1] ?? 'analysis/ablations.json'
    try { refuseFiledWrite(p, []) } catch (e) { refuse(e.message) }
    mkdirSync(p.split(/[\\/]/).slice(0, -1).join('/') || '.', { recursive: true })
    writeFileSync(p, JSON.stringify(out, null, 1))
    console.log('')
    console.log('wrote ' + p)
  }
}
