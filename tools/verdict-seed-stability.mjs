/**
 * verdict-seed-stability.mjs - is R1 = 0 of 4 one bootstrap seed's draw?
 *
 * WHY THIS EXISTS. The tasks-b verdict compares four classifications against the filed batch-1
 * targets, and one of those classifications (GLM) turns on an interval bound a tenth of a point above
 * zero. A reviewer is entitled to ask whether the verdict is an artefact of the filed seed 12345. This
 * tool re-runs the SAME estimators the panel uses - tools/cost-panel.mjs's paired per-task differences
 * and tools/stats.mjs's cluster bootstrap - with an explicit seed per replicate, and applies the SAME
 * filed classification and targets imported from tools/replication-verdict.mjs. No rule is
 * re-implemented here, and nothing is eyeballed: the classifications are computed.
 *
 * Usage: node tools/verdict-seed-stability.mjs [--seeds 20] [--iters 200000] [--json <path>]
 */
import { buildPanel, pairedDiffs, summarise } from './cost-panel.mjs'
import { bootstrapTaskMean } from './stats.mjs'
import { classify, BATCH1 } from './replication-verdict.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const DATASET_OF = {
  'qwen3.8-flash': 'batchb-qwen',
  'glm-5.3-flash': 'batchb-glm-flash',
  'gpt-6-luna': 'batchb-luna',
  'deepseek-flash': 'batchb-deepseek',
}

/**
 * One row per replicate seed: every pre-registered provider's tasks-b interval and classification,
 * against the classification the plan filed. R1 matched = how many equal it, R2 = whether both a
 * positive and a negative appear.
 */
export function seedStability ({ seeds, iters }) {
  const out = { seeds: [], providers: {}, summary: {} }
  let panel = null
  for (const b of BATCH1) {
    const res = buildPanel({ datasets: [DATASET_OF[b.model]] })
    panel = res.panel
    const d = pairedDiffs(panel, b.model, 'dsh:native', 'dsh:ptc')
    const nat = summarise(panel).find((r) => r.model === b.model && r.arm === 'dsh:native')
    const bySeed = []
    for (const seed of seeds) {
      const ci = bootstrapTaskMean(d, { seed, iters })
      const loPct = ci.lo / nat.billed * 100
      const hiPct = ci.hi / nat.billed * 100
      const classification = classify(loPct, hiPct)
      bySeed.push({ seed, loPct, hiPct, classification, match: classification === b.classification })
    }
    out.providers[b.model] = { label: b.label, tasks: d.size, target: b.classification, targetCiPct: b.ciPct, bySeed }
  }
  out.seeds = seeds.slice()
  out.iters = iters
  const r1Counts = {}
  const verdicts = {}
  for (let i = 0; i < seeds.length; i++) {
    const classes = BATCH1.map((b) => out.providers[b.model].bySeed[i].classification)
    const matched = BATCH1.filter((b, j) => classes[j] === b.classification).length
    r1Counts[matched] = (r1Counts[matched] ?? 0) + 1
    const r2 = classes.includes('positive') && classes.includes('negative')
    const verdict = matched === 4 && r2 ? 'replicated' : matched === 3 ? 'partially replicated' : 'not replicated'
    verdicts[verdict] = (verdicts[verdict] ?? 0) + 1
  }
  const bounds = {}
  for (const b of BATCH1) {
    const ys = out.providers[b.model].bySeed
    bounds[b.model] = { minHiPct: Math.min(...ys.map((y) => y.hiPct)), maxHiPct: Math.max(...ys.map((y) => y.hiPct)), classes: [...new Set(ys.map((y) => y.classification))] }
  }
  out.summary = { seeds: seeds.length, iters, r1MatchedCounts: r1Counts, verdicts, bounds }
  return out
}

if (process.argv[1] && process.argv[1].endsWith('verdict-seed-stability.mjs')) {
  const argv = process.argv.slice(2)
  const arg = (name, dflt) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : dflt)
  const nSeeds = Number(arg('--seeds', 20))
  const iters = Number(arg('--iters', 200000))
  const seeds = [12345, ...Array.from({ length: nSeeds - 1 }, (_, i) => i + 1)]
  console.log('tasks-b R1 across ' + seeds.length + ' bootstrap seeds at B = ' + iters.toLocaleString() + ' (seed 12345 is the filed default)')
  const out = seedStability({ seeds, iters })
  console.log('')
  console.log('  ' + 'provider'.padEnd(20) + 'filed target'.padStart(14) + '  classes seen across seeds'.padStart(30) + '   ciHi range (pp)')
  for (const [model, p] of Object.entries(out.providers)) {
    const ys = p.bySeed
    const hi = ys.map((y) => y.hiPct)
    console.log('  ' + p.label.padEnd(20) + p.target.padStart(14) + ('  ' + out.summary.bounds[model].classes.join('/')).padStart(30) +
      ('   ' + Math.min(...hi).toFixed(2) + ' .. ' + Math.max(...hi).toFixed(2)).padStart(20))
  }
  console.log('')
  console.log('  R1 matched counts across seeds: ' + JSON.stringify(out.summary.r1MatchedCounts))
  console.log('  verdicts across seeds: ' + JSON.stringify(out.summary.verdicts))
  console.log('  R1 = 0 of 4 on every seed: ' + ((out.summary.r1MatchedCounts['0'] ?? 0) === seeds.length))
  const outPath = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null
  if (outPath) {
    out.generated = new Date().toISOString()
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, JSON.stringify(out, null, 1))
    console.log('')
    console.log('  wrote ' + outPath)
  }
}
