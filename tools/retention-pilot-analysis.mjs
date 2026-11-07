/**
 * retention-pilot-analysis.mjs - the Anthropic-native retention pilot's filed analysis.
 *
 * WHY THIS EXISTS. The pilot's pre-declaration (notes/records/RETENTION-PILOT-2026-10-10.md) fixes the analysis
 * before the data: per-harness mean prefix retention with a task-cluster percentile bootstrap over the
 * tasks, reported against the study's DSH field 0.994-1.000. The metric itself lives in
 * tools/prefix-retention.mjs (analyse/perArmRetention); the cost function lives in tools/prices.mjs.
 * This tool only joins them and writes one JSON - it re-implements no rule.
 *
 * Usage: node tools/retention-pilot-analysis.mjs --dir results/retentionpilot-haiku-full \
 *          [--control results/retentionpilot-smoke-dsh-full] [--json analysis/retention-pilot-2026-10-10.json]
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { analyse, perArmRetention } from './prefix-retention.mjs'
import { costOf } from './prices.mjs'
import { MODELS } from './cost-panel.mjs'

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }

/** Cost of every request in a dataset's gateway records, using the filed card and cost function. */
export function datasetCost (dir, model) {
  const runsPath = join(dir, 'runs.jsonl')
  if (!existsSync(runsPath)) return { runs: 0, totalUsd: null, cacheHitTokens: 0, cacheWriteTokens: 0, requests: 0, unknownCache: 0 }
  const ids = new Set(readFileSync(runsPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).runId).filter(Boolean))
  let total = 0, requests = 0, hit = 0, write = 0, unknown = 0
  for (const f of readdirSync('results').filter((x) => /gateway.*\.jsonl$/.test(x) && !/selftest/.test(x))) {
    for (const line of readFileSync(join('results', f), 'utf8').split('\n')) {
      if (!line.trim()) continue
      let o; try { o = JSON.parse(line) } catch { continue }
      if (!o.runId || !ids.has(o.runId) || !o.usage) continue
      requests++
      total += costOf(model, o.usage)
      hit += o.usage.cacheHitTokens ?? 0
      write += o.usage.cacheCreationTokens ?? 0
      if ((o.usage.cacheHitTokens ?? null) === null) unknown++
    }
  }
  return { runs: ids.size, requests, totalUsd: total, perRunUsd: ids.size ? total / ids.size : null, cacheHitTokens: hit, cacheWriteTokens: write, cacheWriteShareOfInput: null, unknownCache: unknown }
}

if (process.argv[1] && process.argv[1].endsWith('retention-pilot-analysis.mjs')) {
  const dir = opt('--dir', 'results/retentionpilot-haiku-full')
  const controlDir = opt('--control', null)
  const model = opt('--model', 'claude-haiku-4.5')
  if (!existsSync(join(dir, 'runs.jsonl'))) { console.error('no runs.jsonl in ' + dir); process.exit(2) }
  const { rows, gatewayLogs } = analyse({ datasets: [dir.replace(/^results\//, '')] })
  const arms = perArmRetention(rows)
  const cost = datasetCost(dir, model)
  const control = controlDir ? { dir: controlDir, arms: perArmRetention(analyse({ datasets: [controlDir.replace(/^results\//, '')] }).rows), cost: datasetCost(controlDir, model) } : null
  const card = MODELS[model]?.card ?? null
  const out = {
    generated: new Date().toISOString(),
    model, card, dataset: dir, metric: 'tools/prefix-retention.mjs: continuation >= 50% of the largest prompt so far; retention = cacheHit(i)/largest prompt before i, clamped [0,1]',
    estimator: 'per-harness mean retention over tasks; task-cluster percentile bootstrap (tools/stats.mjs bootstrapTaskMean)',
    iters: arms[0]?.iters ?? null, seed: arms[0]?.seed ?? null,
    cells: rows.length, gatewayLogs,
    // The population, so the filed JSON explains its own n: collected cells, how many solved, how many
    // carried a usable retention value, and how many the collector's own exclusion rule dropped.
    population: (() => {
      const all = readFileSync(join(dir, 'runs.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
      return { collected: all.length, solved: all.filter((r) => r.solved).length, carried: rows.length,
        excluded: all.length - rows.length,
        note: 'carried = cells with an analysable retention value; excluded = cells with no usable usage (the collector rule-9 exclusion)' }
    })(),
    arms, cost, control,
    dshField: { lo: 0.994, hi: 1.000, source: 'PAPER.md section 3.3 (haiku ptc 0.9941 / native 0.9996)' },
  }
  const jp = opt('--json', null)
  if (jp) { mkdirSync(dirname(jp), { recursive: true }); writeFileSync(jp, JSON.stringify(out, null, 1)); console.log('wrote ' + jp) }
  console.log('')
  console.log('  ' + 'harness'.padEnd(22) + 'tasks'.padStart(6) + 'runs'.padStart(6) + 'mean retention'.padStart(16) + '   95% CI (task bootstrap)')
  const ci = (a) => a.ciLo === null || a.ciHi === null ? 'n/a (one task: no interval)' : '[' + a.ciLo.toFixed(4) + ', ' + a.ciHi.toFixed(4) + ']'
  for (const a of arms) console.log('  ' + a.arm.padEnd(22) + String(a.tasks).padStart(6) + String(a.runs).padStart(6) + a.meanRetention.toFixed(4).padStart(16) + ('   ' + ci(a)).padStart(28))
  console.log('  DSH field (study): 0.994-1.000')
  if (control) for (const a of control.arms) console.log('  CONTROL ' + a.arm.padEnd(14) + a.meanRetention.toFixed(4) + '  ' + ci(a))
  console.log('  cost: $' + (cost.totalUsd ?? 0).toFixed(4) + ' over ' + cost.runs + ' runs = $' + (cost.perRunUsd ?? 0).toFixed(4) + '/cell; cache write tokens ' + cost.cacheWriteTokens + ', hit tokens ' + cost.cacheHitTokens)
}
