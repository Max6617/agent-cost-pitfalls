/**
 * common-f-check.mjs - is the position adjustment's shared-step-function assumption testable here?
 *
 * WHY THIS EXISTS. PAPER.md section 3.1 and limitation 8 state that the execution-order adjustment
 * assumes ONE step function f shared by the two arms:
 *
 *     d = c_ptc - c_native = alpha + [f(p_ptc) - f(p_native)]
 *
 * If f differs by arm - g for the PTC arm, h for the native arm - alpha absorbs the difference. The
 * paper says the design cannot test that, because the arm-specific form needs about eighteen position
 * parameters on 62 blocks. That was an assertion from a scratch fit (REVIEW-4 objection 6,
 * results/_scratch/review4/arm-specific-f.mjs). This tool files it as a reproducible result on the
 * shipped panels: the common-f fit through the study's own estimator, the arm-specific fit, the
 * arm-specific intercept's standard error, and the swing between the two point estimates.
 *
 * WHAT IS AND IS NOT REIMPLEMENTED. The common-f side is tools/position-adjust.mjs's own pairedBlocks
 * and adjustedFit - the filed estimator, imported. The arm-specific side is the same least-squares
 * core the study already uses (tools/mixed-effects.mjs's olsReference) on a wider design matrix; only
 * the DESIGN is new, which is the point of the check.
 *
 * Usage: node tools/common-f-check.mjs [--json analysis/common-f-infeasibility-2026-10-10.json]
 */
import { buildPanel, MODELS, SUITES, mean } from './cost-panel.mjs'
import { pairedBlocks, adjustedFit, toPercent, NATIVE_ARM, PTC_ARM } from './position-adjust.mjs'
import { olsReference } from './mixed-effects.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * A 0.2-log-unit standard error on alpha is about +/-22% once converted to the percent scale - larger
 * than every adjusted effect this paper reports except haiku's. An estimate at that resolution cannot
 * arbitrate whether f differs by arm, which is what "untestable on this design" means quantitatively.
 */
export const COMMON_F_SE_THRESHOLD = 0.2

/**
 * The arm-specific design: d = alpha + g(p_ptc) - h(p_native), with position 0 as the reference for
 * both g and h, so the matrix carries one column per non-reference position for each arm.
 */
export function armSpecificFit (blocks) {
  const colsQ = [...new Set(blocks.map((b) => b.pq))].filter((p) => p !== 0).sort((a, b) => a - b)
  const colsN = [...new Set(blocks.map((b) => b.pn))].filter((p) => p !== 0).sort((a, b) => a - b)
  const X = blocks.map((b) => [
    ...colsQ.map((p) => (b.pq === p ? 1 : 0)),
    ...colsN.map((p) => (b.pn === p ? -1 : 0)),
  ])
  const y = blocks.map((b) => Math.log(Math.max(b.cq, 1e-12)) - Math.log(Math.max(b.cn, 1e-12)))
  const fit = olsReference(y, X)
  return { ...fit, colsQ, colsN }
}

/** Both fits, per model, per suite. Exported so the test can assert the shape without the CLI. */
export function analyse () {
  const out = {
    generated: new Date().toISOString(),
    method: 'common-f: tools/position-adjust.mjs adjustedFit (log scale); arm-specific: olsReference on d = alpha + g(p_ptc) - h(p_native), one column per non-reference position per arm',
    scale: 'log',
    seThresholdLog: COMMON_F_SE_THRESHOLD,
    suites: {},
  }
  for (const [suite, datasets] of [['batch1', SUITES.batch1], ['batchb', SUITES.batchb]]) {
    const { panel } = buildPanel({ datasets })
    const models = []
    for (const m of Object.keys(MODELS)) {
      const rows = panel.filter((r) => r.model === m && (r.arm === NATIVE_ARM || r.arm === PTC_ARM))
      if (rows.length < 20) continue
      const blocks = pairedBlocks(rows)
      const nativeMean = mean(rows.filter((r) => r.arm === NATIVE_ARM).map((r) => r.costBilled))
      const common = adjustedFit(blocks, { scale: 'log' })
      const spec = armSpecificFit(blocks)
      const commonPct = toPercent(common.alpha, 'log', nativeMean)
      const rec = {
        model: m, label: MODELS[m].label, blocks: blocks.length,
        positionPairs: new Set(blocks.map((b) => b.pn + '>' + b.pq)).size,
        params: spec.colsQ.length + spec.colsN.length + 1,
        commonPct, commonSeLog: common.se,
        rankDeficient: !!spec.singular,
        armSpecificPct: null, armSpecificSeLog: null, swingPp: null,
      }
      if (!spec.singular) {
        rec.armSpecificPct = toPercent(spec.beta[0], 'log', nativeMean)
        rec.armSpecificSeLog = spec.se[0]
        rec.swingPp = rec.armSpecificPct - commonPct
      }
      models.push(rec)
    }
    out.suites[suite] = { datasets, models }
  }
  const all = Object.values(out.suites).flatMap((s) => s.models)
  const identified = all.filter((r) => !r.rankDeficient)
  out.summary = {
    models: all.length,
    rankDeficient: all.filter((r) => r.rankDeficient).length,
    minArmSpecificSeLog: identified.length ? Math.min(...identified.map((r) => r.armSpecificSeLog)) : null,
    maxArmSpecificSeLog: identified.length ? Math.max(...identified.map((r) => r.armSpecificSeLog)) : null,
    allAboveThreshold: identified.length ? identified.every((r) => r.armSpecificSeLog > COMMON_F_SE_THRESHOLD) : null,
    maxAbsSwingPp: identified.length ? Math.max(...identified.map((r) => Math.abs(r.swingPp))) : null,
  }
  return out
}

const fmt = (v, d = 1) => (v == null ? 'n/a' : (v >= 0 ? '+' : '') + v.toFixed(d))

if (process.argv[1] && process.argv[1].endsWith('common-f-check.mjs')) {
  const argv = process.argv.slice(2)
  const out = analyse()
  console.log('COMMON-F vs ARM-SPECIFIC f - is the shared step function testable on this design?\n')
  for (const [suite, s] of Object.entries(out.suites)) {
    console.log('  ' + suite + '  (' + s.models.length + ' models)')
    console.log('    ' + 'model'.padEnd(22) + 'blocks'.padStart(7) + 'params'.padStart(7) + 'common-f'.padStart(10) + 'arm-spec'.padStart(10) + 'swing'.padStart(9) + 'SE(log)'.padStart(9) + '  verdict')
    for (const r of s.models) {
      console.log('    ' + r.label.padEnd(22) + String(r.blocks).padStart(7) + String(r.params).padStart(7) +
        (fmt(r.commonPct) + '%').padStart(10) + (fmt(r.armSpecificPct) + '%').padStart(10) + (fmt(r.swingPp) + 'pp').padStart(9) +
        (r.armSpecificSeLog == null ? 'n/a' : r.armSpecificSeLog.toFixed(3)).padStart(9) +
        '  ' + (r.rankDeficient ? 'RANK DEFICIENT' : (r.armSpecificSeLog > COMMON_F_SE_THRESHOLD ? 'not identified (SE > ' + COMMON_F_SE_THRESHOLD + ')' : 'identified')))
    }
    console.log('')
  }
  console.log('  summary: ' + JSON.stringify(out.summary))
  const ji = argv.indexOf('--json')
  if (ji >= 0) {
    const p = argv[ji + 1] ?? 'analysis/common-f-infeasibility.json'
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, JSON.stringify(out, null, 1))
    console.log('')
    console.log('  wrote ' + p)
  }
}
