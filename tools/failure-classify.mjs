/**
 * failure-classify.mjs - before an unsolved run is read as a model failure, name its cause.
 *
 * Uses tools/exclusions.mjs, which is the single definition of the rule. Nothing here has
 * its own regex: a second copy of the rule is how the rule drifted in the first place.
 *
 * Usage: node tools/failure-classify.mjs
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { exclusionVerdict } from './exclusions.mjs'
import { parseSyntheticKey } from './attribute.mjs'
import { discoverGateways } from './cost-panel.mjs'

// THE STATUS HALF MATTERS HERE MORE THAN ANYWHERE. This is the tool FINDINGS F33 cites as the rule
// for the solve-rate table, and until now it applied only the text half - so the 112 hardbatch-qwen
// runs whose every request returned HTTP 400 were printed as "genuinely unexplained failures", i.e.
// as model failures, by the tool that defines what a model failure is.
const requestsByRun = new Map()
for (const f of discoverGateways()) {
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let o; try { o = JSON.parse(line) } catch { continue }
    const a = parseSyntheticKey(o.syntheticKey)
    const rid = a?.runId ?? o.runId
    if (!rid) continue
    if (!requestsByRun.has(rid)) requestsByRun.set(rid, [])
    requestsByRun.get(rid).push({ status: o.status })
  }
}
const verdictOf = (r) => exclusionVerdict(r, requestsByRun.get(r.runId) ?? [])

const dirs = readdirSync('results', { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
const datasets = []
for (const d of dirs) {
  const p = 'results/' + d + '/runs.jsonl'
  if (!existsSync(p)) continue
  const rows = readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  if (!rows.length) continue
  datasets.push({ id: d, rows })
}

console.log('UNSOLVED RUNS BY NAMED CAUSE')
console.log('A run counts once, under the first signature its own stdout/stderr matches.')
console.log('"unexplained" = unsolved with no named cause: the only bucket readable as a model failure.\n')
console.log('  ' + 'dataset'.padEnd(22) + 'runs'.padStart(5) + 'solved'.padStart(7) + 'unsolved'.padStart(9) + 'infra-excl'.padStart(11) + '  causes')

const summary = []
for (const { id, rows } of datasets.sort((a, b) => b.rows.length - a.rows.length)) {
  const unsolved = rows.filter((r) => !r.solved)
  const buckets = {}
  let infra = 0
  for (const r of rows) {
    const v = verdictOf(r)
    buckets[v.cause] = (buckets[v.cause] ?? 0) + 1
    if (v.excluded) infra++
  }
  const named = unsolved.filter((r) => verdictOf(r).cause !== 'unexplained')
  const order = Object.entries(buckets).filter(([k]) => k !== 'solved').sort((a, b) => b[1] - a[1])
  if (!unsolved.length && !order.length) { /* still print: a clean matrix is a result */ }
  console.log('  ' + id.padEnd(22) + String(rows.length).padStart(5) + String(rows.length - unsolved.length).padStart(7) +
    String(unsolved.length).padStart(9) + String(infra).padStart(11) + '  ' + (order.length ? order.map(([k, v]) => k + ':' + v).join('  ') : 'clean'))
  summary.push({ dataset: id, runs: rows.length, solved: rows.length - unsolved.length, unsolved: unsolved.length, namedFault: named.length, infraExcluded: infra, buckets })
}

console.log('\n--- the two solve rates F28 reports, recomputed under rule 9 ---')
for (const id of ['luna-full', 'haiku-full', 'sonnet-full', 'qwen-full', 'ds-full', 'glm53']) {
  const s = summary.find((x) => x.dataset === id)
  if (!s) continue
  const denom = s.runs - s.infraExcluded
  const unexplainedUnsolved = (s.buckets.unexplained ?? 0)
  console.log('  ' + id.padEnd(14) +
    'as published ' + String(s.solved + '/' + s.runs).padStart(9) + ' = ' + (s.solved / s.runs * 100).toFixed(1).padStart(5) + '%' +
    '   |  after rule-9 exclusions ' + String(s.solved + '/' + denom).padStart(9) + ' = ' + (s.solved / denom * 100).toFixed(1).padStart(5) + '%' +
    '   (' + s.infraExcluded + ' excluded; ' + unexplainedUnsolved + ' genuinely unexplained failures remain)')
}
