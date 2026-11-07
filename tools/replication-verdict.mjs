/**
 * replication-verdict.mjs - the tasks-b replication verdict, decided by the rule that was filed
 * before any tasks-b run record existed.
 *
 * WHY THIS TOOL EXISTS
 * --------------------
 * tasks-b/PLAN.md section 5 fixes mechanically what "the batch-1 result replicated" means:
 *
 *   R1 (per-provider classification): all four providers' tasks-b classifications equal their
 *       batch-1 classifications - Qwen positive, GLM-Flash negative, luna null, DeepSeek null.
 *   R2 (the headline pattern): at least one provider classifies positive and at least one
 *       classifies negative on tasks-b - the sign disagreement itself reproduces on the new suite.
 *   Verdict: *replicated* requires R1 (4 of 4) and R2. If R1 holds for exactly 3 of 4 providers the
 *       verdict is *partially replicated* and the deviating provider is named. Otherwise *not
 *       replicated*. There is no "replicated with caveats" tier invented after the fact.
 *
 * Nothing implemented that rule. The result circulated as prose, and prose is not the rule: GLM's
 * tasks-b interval ends a tenth of a percentage point above zero, so the mechanical rule makes GLM
 * NULL while the prose called it negative. A classification that turns on the last decimal has to be
 * computed, not summarised - which is the whole reason the plan states the rule in advance. The bound
 * itself moves with the bootstrap re-filing (+0.0405% at B = 5,000 on 2026-10-09; +0.14% at
 * B = 200,000 on 2026-10-10), and the rule is the same at either resolution.
 *
 * THIS TOOL RECOMPUTES NOTHING. It reads a filed panel-analysis JSON - the same A2 rows every other
 * document quotes - and applies notes/plans/PLAN.md's rules to them. It cannot drift from A2, because it has no
 * estimator of its own; tools/cost-panel.mjs owns the panel and tools/stats.mjs owns the bootstrap.
 * If a pre-registered provider's A2 row is missing it REFUSES to return a verdict, because "we did
 * not collect it" must never be read as "it did not match".
 *
 * ANTHROPIC IS NOT IN THE VERDICT. notes/plans/PLAN.md section 2 declares the tasks-b design as the four cheap
 * providers, "No Anthropic". haiku and sonnet were collected afterwards as an extension. They are
 * reported here, and excluded from R1/R2, because a provider added after the filing cannot move a
 * pre-registered claim about the four.
 *
 * Usage: node tools/replication-verdict.mjs [--panel analysis/panel-analysis-batchb-2026-10-09.json]
 *                                          [--json analysis/replication-verdict-batchb-<date>.json]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { refuseFiledWrite } from './cost-panel.mjs'

// ---- the filed rule, quoted ------------------------------------------------------------------
// tasks-b/PLAN.md section 1, the batch-1 replication target. The point estimates, intervals and
// classifications are the plan's own; they are transcribed here because a pre-registered rule that
// re-derives its own target is not pre-registered. The plan's order is preserved.
export const BATCH1 = [
  { model: 'qwen3.8-flash', label: 'Qwen3.8-Flash', relPct: 30.7, ciPct: [10.0, 53.3], classification: 'positive' },
  { model: 'glm-5.3-flash', label: 'GLM-5.3-Flash', relPct: -20.8, ciPct: [-43.7, -2.7], classification: 'negative' },
  { model: 'gpt-6-luna', label: 'gpt-6-luna', relPct: 1.2, ciPct: [-8.4, 11.3], classification: 'null' },
  { model: 'deepseek-flash', label: 'DeepSeek V4.1 Flash', relPct: 0.1, ciPct: [-9.0, 9.8], classification: 'null' },
]
export const PREREG_MODELS = BATCH1.map((b) => b.model)
/** The Anthropic extension: collected after the filing, reported, never part of R1/R2. */
export const EXTENSION_MODELS = ['claude-sonnet-5.5', 'claude-haiku-4.5']

/**
 * notes/plans/PLAN.md Amendment 1 section 9.1's extension rule, quoted: "classification matches its batch-1 row
 * -> extension row replicated; otherwise extension row not replicated, naming the model." The targets
 * are the plan's own text - it quotes the six-model A2 rows of 2026-10-03 - transcribed here for the
 * same reason BATCH1 is: a pre-registered target that re-derives itself is not pre-registered.
 *
 * THE TARGET AND THE CORRECTED RECORD DIVERGE FOR SONNET, and the paper reports both. At the filed
 * B = 5,000 the Sonnet batch-1 row is +9.5% [+0.3, +17.9], positive. At the re-filed B = 200,000 it is
 * +9.5% [-0.08, +18.01] (analysis/panel-analysis-6model-2026-10-09.json): the interval contains zero,
 * so under the corrected record the rule would read "null -> null" and call the row replicated. This
 * tool applies the FILED target, because that is what was filed before the data existed, and prints
 * the corrected classification beside it so the divergence is visible rather than chosen.
 */
export const EXTENSION_TARGETS = [
  { model: 'claude-haiku-4.5', label: 'Claude Haiku 4.5', relPct: 53.8, ciPct: [31.8, 77.8], classification: 'positive' },
  { model: 'claude-sonnet-5.5', label: 'Claude Sonnet 5.5', relPct: 9.5, ciPct: [0.3, 17.9], classification: 'positive' },
]

/**
 * notes/plans/PLAN.md section 5's classification, which is also how the plan classifies its own batch-1 rows:
 * positive when the 95% interval lies entirely above 0, negative when entirely below, null when the
 * interval contains 0. Strict inequalities, so an interval that touches 0 is null.
 */
export function classify(ciLoPct, ciHiPct) {
  if (!Number.isFinite(ciLoPct) || !Number.isFinite(ciHiPct)) throw new Error('classify: non-finite interval')
  if (ciLoPct > ciHiPct) throw new Error('classify: inverted interval [' + ciLoPct + ', ' + ciHiPct + ']')
  if (ciLoPct > 0) return 'positive'
  if (ciHiPct < 0) return 'negative'
  return 'null'
}

/** R3, reported alongside: do the two intervals overlap at all? */
export function overlaps(aLo, aHi, bLo, bHi) { return !(aHi < bLo || bHi < aLo) }

/**
 * R1, R2 and the section 5 verdict, from the four providers' tasks-b A2 rows.
 *
 * `rows` are A2 rows: { model, label, relDiffPct, ciLoPct, ciHiPct, tasks }. A missing pre-registered
 * provider throws, rather than being counted as a non-match.
 */
export function replicationVerdict(rows) {
  const byModel = new Map(rows.map((r) => [r.model, r]))
  const providers = BATCH1.map((b) => {
    const r = byModel.get(b.model)
    if (!r) throw new Error('no tasks-b A2 row for the pre-registered provider ' + b.model + ': refusing to return a verdict')
    const classification = classify(r.ciLoPct, r.ciHiPct)
    return {
      model: b.model, label: b.label, tasks: r.tasks,
      batch1: { relPct: b.relPct, ciPct: b.ciPct, classification: b.classification },
      tasksB: { relPct: r.relDiffPct, ciPct: [r.ciLoPct, r.ciHiPct], classification },
      match: classification === b.classification,
      // A null whose nearest bound sits on top of 0 is a classification that turns on the last
      // decimal. GLM's tasks-b interval ends a tenth of a point above 0, so the mechanical rule says
      // null while every one-decimal rendering of the same interval reads as "negative, excludes
      // zero". That is precisely how the prose verdict drifted from the filed rule, so the tool says
      // it out loud. The printed value is read from the panel; no fixed number is quoted here.
      nearestBoundToZeroPp: Math.min(Math.abs(r.ciLoPct), Math.abs(r.ciHiPct)),
      knifeEdge: classification === 'null' && Math.min(Math.abs(r.ciLoPct), Math.abs(r.ciHiPct)) < 0.5,
      r3: {
        batch1PointInTasksBci: r.ciLoPct <= b.relPct && b.relPct <= r.ciHiPct,
        tasksBPointInBatch1ci: b.ciPct[0] <= r.relDiffPct && b.ciPct[1] >= r.relDiffPct,
        ciOverlap: overlaps(b.ciPct[0], b.ciPct[1], r.ciLoPct, r.ciHiPct),
      },
    }
  })
  const matched = providers.filter((p) => p.match)
  const deviations = providers.filter((p) => !p.match).map((p) => ({ model: p.model, label: p.label, batch1: p.batch1.classification, tasksB: p.tasksB.classification }))
  const classes = new Set(providers.map((p) => p.tasksB.classification))
  const R1 = { holds: matched.length === providers.length, matched: matched.length, of: providers.length, deviations }
  const R2 = { holds: classes.has('positive') && classes.has('negative'), sawPositive: classes.has('positive'), sawNegative: classes.has('negative') }
  let verdict
  if (R1.holds && R2.holds) verdict = 'replicated'
  else if (R1.matched === providers.length - 1) verdict = 'partially replicated'
  else verdict = 'not replicated'
  return { providers, R1, R2, verdict }
}

/**
 * notes/plans/PLAN.md Amendment 1 section 9.1, applied per model: the extension row replicated if its tasks-b
 * classification equals the classification the plan filed for its batch-1 target. A model with no
 * tasks-b row is reported as NOT COLLECTED rather than counted as a non-match - the same rule the
 * four-provider verdict uses for a missing provider. `corrected` is the batch-1 classification at
 * the current re-filing, when the caller supplies it; it is reported, never substituted.
 */
export function extensionVerdict(rows, correctedBatch1 = []) {
  const byModel = new Map(rows.map((r) => [r.model, r]))
  const corrected = new Map(correctedBatch1.map((r) => [r.model, r]))
  return EXTENSION_TARGETS.map((t) => {
    const r = byModel.get(t.model)
    const c = corrected.get(t.model)
    const correctedClassification = c ? classify(c.ciLoPct, c.ciHiPct) : null
    if (!r) {
      return {
        model: t.model, label: t.label, absent: true,
        target: t.classification, classification: null, replicated: null,
        correctedClassification, correctedReplicates: null,
      }
    }
    const classification = classify(r.ciLoPct, r.ciHiPct)
    return {
      model: t.model, label: t.label, absent: false, tasks: r.tasks,
      relDiffPct: r.relDiffPct, ciPct: [r.ciLoPct, r.ciHiPct], classification,
      target: t.classification, replicated: classification === t.classification,
      correctedClassification,
      // The same rule with the corrected batch-1 row as the target: does the tasks-b classification
      // match what batch 1 classifies as at the current re-filing? Reported, never substituted.
      correctedReplicates: correctedClassification === null ? null : classification === correctedClassification,
    }
  })
}

// ---- CLI -------------------------------------------------------------------------------------
if (process.argv[1] && process.argv[1].endsWith('replication-verdict.mjs')) main()

function main() {
  const argv = process.argv.slice(2)
  const arg = (name, dflt) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : dflt)
  const panelPath = arg('--panel', 'analysis/panel-analysis-batchb-2026-10-09.json')
  const outPath = arg('--json', null)
  const batch1Path = arg('--batch1-panel', null)
  const batch1J = batch1Path ? JSON.parse(readFileSync(batch1Path, 'utf8')) : null
  const correctedBatch1 = batch1J?.sections?.A2 ?? []
  const j = JSON.parse(readFileSync(panelPath, 'utf8'))
  const a2 = j.sections && j.sections.A2
  if (!Array.isArray(a2)) { console.error('REFUSING: ' + panelPath + ' has no sections.A2 array'); process.exit(2) }

  const v = replicationVerdict(a2)
  const fmt = (x) => (x >= 0 ? '+' : '') + x.toFixed(1) + '%'
  // Intervals print to TWO decimals on purpose: at one decimal, GLM's upper bound (a tenth of a
  // point above 0) renders as "+0.0%" and a null looks like a negative. See the knifeEdge field.
  const ci = (c) => '[' + ((c[0] >= 0 ? '+' : '') + c[0].toFixed(2)) + '%, ' + ((c[1] >= 0 ? '+' : '') + c[1].toFixed(2)) + '%]'

  console.log('tasks-b replication verdict - tasks-b/PLAN.md section 5, applied to ' + panelPath)
  console.log('  panel generated ' + j.generated + '; ' + a2.length + ' models in A2, ' + v.providers.length + ' pre-registered')
  console.log('')
  console.log('  ' + 'provider'.padEnd(20) + 'batch-1'.padStart(12) + 'batch-1 95% CI'.padStart(20) + '  tasks-b'.padStart(12) + 'tasks-b 95% CI'.padStart(22) + 'tasks'.padStart(7) + '  R1')
  for (const p of v.providers) {
    console.log('  ' + p.label.padEnd(20) + p.batch1.classification.padStart(12) +
      ci(p.batch1.ciPct).padStart(20) + ('  ' + p.tasksB.classification).padStart(12) +
      ci(p.tasksB.ciPct).padStart(22) + String(p.tasks).padStart(7) + '  ' + (p.match ? 'match' : 'DIFFERS') + (p.knifeEdge ? '  KNIFE-EDGE: nearest bound is ' + p.nearestBoundToZeroPp.toFixed(4) + 'pp from 0' : ''))
  }
  console.log('')
  console.log('  R1 (per-provider classification, 4 of 4): ' + (v.R1.holds ? 'HOLDS' : 'FAILS') + '  (' + v.R1.matched + ' of ' + v.R1.of + ')')
  for (const d of v.R1.deviations) console.log('       ' + d.label + ': batch-1 ' + d.batch1 + ' -> tasks-b ' + d.tasksB)
  console.log('  R2 (at least one positive AND one negative): ' + (v.R2.holds ? 'HOLDS' : 'FAILS') +
    '  (positive: ' + (v.R2.sawPositive ? 'yes' : 'NONE') + ', negative: ' + (v.R2.sawNegative ? 'yes' : 'none') + ')')
  console.log('  VERDICT: ' + v.verdict.toUpperCase())
  console.log('')
  console.log('  R3 (reported alongside, not part of the verdict):')
  for (const p of v.providers) {
    console.log('    ' + p.label.padEnd(20) + 'batch-1 point inside tasks-b CI: ' + String(p.r3.batch1PointInTasksBci).padEnd(6) +
      ' tasks-b point inside batch-1 CI: ' + String(p.r3.tasksBPointInBatch1ci).padEnd(6) + ' intervals overlap: ' + p.r3.ciOverlap)
  }
  const ext = a2.filter((r) => EXTENSION_MODELS.includes(r.model))
  if (ext.length) {
    console.log('')
    console.log('  NOT PART OF THE VERDICT - the Anthropic extension. notes/plans/PLAN.md section 2 filed the design with')
    console.log('  "No Anthropic"; these rows were collected afterwards and cannot move a claim about the four.')
    for (const r of ext) console.log('    ' + r.label.padEnd(20) + classify(r.ciLoPct, r.ciHiPct).padStart(9) + '  ' + fmt(r.relDiffPct) + ' ' + ci([r.ciLoPct, r.ciHiPct]) + '  ' + r.tasks + ' paired tasks')
    const classes = new Set(ext.map((r) => classify(r.ciLoPct, r.ciHiPct)))
    console.log('    the verdict would be unchanged if they were added: positive ' + (classes.has('positive') ? 'yes' : 'NONE') + ', negative ' + (classes.has('negative') ? 'yes' : 'none'))
    const ev = extensionVerdict(ext, correctedBatch1)
    console.log('')
    console.log('    notes/plans/PLAN.md Amendment 1 section 9.1, applied per model (filed batch-1 target -> tasks-b):')
    for (const x of ev) {
      const outcome = x.absent ? 'NOT COLLECTED'
        : (x.replicated ? 'extension row replicated' : 'EXTENSION ROW NOT REPLICATED')
      console.log('      ' + x.label.padEnd(20) + x.target.padStart(9) + ' -> ' + String(x.classification).padEnd(9) + ' ' + outcome)
    }
    if (correctedBatch1.length) {
      console.log('    at the current batch-1 re-filing the targets classify as: ' + ev.map((x) => x.label + ' ' + (x.correctedClassification ?? 'absent')).join('; '))
      const wouldReplicate = ev.filter((x) => x.correctedReplicates).map((x) => x.label)
      console.log('    with the corrected target the rule would call replicated: ' + (wouldReplicate.length ? wouldReplicate.join(', ') : 'none') + ' (filed target governs; both readings are reported)')
    }
  }

  if (outPath) {
    // This tool READS a filed panel, so it must never write over one. An empty selection is never
    // the default selection, which is what makes cost-panel's guard refuse every recorded path.
    try { refuseFiledWrite(outPath, []) } catch (e) { console.error('REFUSING: ' + e.message); process.exit(2) }
    const out = {
      generated: new Date().toISOString(), panelPath, panelGenerated: j.generated || null,
      rule: 'tasks-b/PLAN.md section 5', providers: v.providers, R1: v.R1, R2: v.R2, verdict: v.verdict,
      extension: ext.map((r) => ({ model: r.model, label: r.label, relDiffPct: r.relDiffPct, ciPct: [r.ciLoPct, r.ciHiPct], tasks: r.tasks, classification: classify(r.ciLoPct, r.ciHiPct) })),
      // notes/plans/PLAN.md Amendment 1 section 9.1, applied. batch1PanelPath records WHICH re-filing the
      // corrected classification came from, or null when no corrected panel was supplied.
      batch1PanelPath: batch1Path,
      batch1PanelGenerated: batch1J?.generated ?? null,
      extensionVerdict: extensionVerdict(ext, correctedBatch1),
    }
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, JSON.stringify(out, null, 1))
    console.log('')
    console.log('wrote ' + outPath)
  }
}