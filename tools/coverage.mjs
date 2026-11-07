/**
 * coverage.mjs - what data we actually hold, per model, and whether it is sound.
 *
 * This is the first command a session should run. It answers four questions that have each
 * cost this project real money or a retracted claim:
 *
 *   1. Is the matrix COMPLETE against its target, per arm? (a 134-record matrix with six of
 *      eight arms never reaching the provider reported itself as working - F28)
 *   2. Are the runs UNIQUE per (task, arm, seed)? (re-runs append; a re-run must be visible)
 *   3. Did the TERSE manipulation actually reach the terse arms? (124 ds-full records say it
 *      did not - REVIEW-RESPONSE section 2.5)
 *   4. How many runs did the provider ERROR out of? (rule 9; three claims were written from
 *      infrastructure failures - F4, F14, F28)
 *
 * Exclusions use tools/exclusions.mjs, which is the single definition. This file used to
 * carry its own bare-word match on "quota", which is how that rule drifted.
 *
 * Usage: node tools/coverage.mjs [--json analysis/coverage.json]
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { exclusionVerdict } from './exclusions.mjs'
import { discoverGateways } from './cost-panel.mjs'
import { parseSyntheticKey } from './attribute.mjs'

/** dir -> model label. Several dirs belong to one model. Target is runs per model. */
const DIRS = {
  'ds-full': 'DeepSeek V4.1 Flash',
  'glm-flash': 'GLM-5.3-Flash',
  'glm-terse': 'GLM-5.3-Flash',
  'glm-harness': 'GLM-5.3-Flash',
  'glm53': 'GLM-5.3',
  'qwen-full': 'Qwen3.8-Flash',
  'haiku-full': 'Claude Haiku 4.5',
  'sonnet-full': 'Claude Sonnet 5.5',
  'luna-full': 'gpt-6-luna',
  'f18-sonnet': 'Claude Sonnet 5.5 (F18 replication)',
}
const EXPECTED_ARMS = ['dsh:native', 'dsh:ptc', 'dsh:native-opt', 'dsh:ptc-opt', 'dsh:native-terse', 'dsh:ptc-terse', 'opencode', 'cline', 'goose', 'openhands']

// Which gateway files actually hold usage for these runs. A run with no gateway row has no cost.
const gwRunIds = new Set()
const gwRequests = new Map()
for (const f of discoverGateways()) {
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let o; try { o = JSON.parse(line) } catch { continue }
    const a = parseSyntheticKey(o.syntheticKey)
    const rid = a?.runId ?? o.runId
    if (!rid) continue
    gwRunIds.add(rid)
    if (!gwRequests.has(rid)) gwRequests.set(rid, [])
    gwRequests.get(rid).push({ status: o.status })
  }
}

const models = {}
const problems = []
for (const [dir, model] of Object.entries(DIRS)) {
  const p = join('results', dir, 'runs.jsonl')
  if (!existsSync(p)) continue
  const runs = readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  const m = models[model] = models[model] ?? { runs: 0, arms: {}, tasks: new Set(), seeds: new Set(), dirs: [], cells: new Set(), infra: 0, unexplained: 0, noGateway: 0, terse: { rows: 0, real: 0 } }
  m.dirs.push(dir)
  for (const r of runs) {
    m.runs++
    const arm = r.harness === 'dsh' ? r.arm : (r.arm ?? r.harness)
    m.arms[arm] = (m.arms[arm] ?? 0) + 1
    if (r.task) m.tasks.add(r.task)
    if (r.seed != null) m.seeds.add(r.seed)
    if (r.task && arm && r.seed != null) m.cells.add([r.task, arm, r.seed].join('|'))
    if (!gwRunIds.has(r.runId)) m.noGateway++
    if (/terse/.test(arm ?? '')) { m.terse.rows++; if (r.terse === true) m.terse.real++ }
    const v = exclusionVerdict(r, gwRequests.get(r.runId) ?? [])
    if (v.excluded) m.infra++
    else if (!r.solved) m.unexplained++
  }
}

for (const [model, m] of Object.entries(models)) {
  const arms = Object.keys(m.arms).sort()
  const expected = EXPECTED_ARMS.filter((a) => arms.includes(a) || EXPECTED_ARMS.length)
  console.log('')
  console.log('=== ' + model + ' ===')
  console.log('  records ' + m.runs + '   unique cells ' + m.cells.size + (m.runs !== m.cells.size ? '   *** ' + (m.runs - m.cells.size) + ' RE-RUN RECORD(S) - first record per cell is primary ***' : ''))
  console.log('  tasks ' + m.tasks.size + '   seeds ' + m.seeds.size + '   arms ' + arms.length + (arms.length < 10 ? '   *** expected 10 ***' : ''))
  const dsh = arms.filter((a) => a.startsWith('dsh:')), ext = arms.filter((a) => !a.startsWith('dsh:'))
  console.log('  DSH arms (' + dsh.length + '): ' + dsh.map((a) => a.replace('dsh:', '')).join(', '))
  console.log('  other harnesses (' + ext.length + '): ' + (ext.join(', ') || 'none'))
  const per = arms.map((a) => a.replace('dsh:', '') + '=' + m.arms[a])
  console.log('  per arm: ' + per.join('  '))
  const counts = arms.map((a) => m.arms[a])
  const lo = Math.min(...counts), hi = Math.max(...counts)
  console.log('  BALANCE: min ' + lo + ', max ' + hi + (lo === hi ? '  (perfectly balanced)' : '  *** UNBALANCED by ' + (hi - lo) + ' ***'))
  console.log('  solved ' + (m.runs - m.infra - m.unexplained) + '   rule-9 infrastructure exclusions ' + m.infra + '   unexplained failures ' + m.unexplained)
  console.log('  runs with no gateway usage (no cost measurable): ' + m.noGateway)
  if (m.terse.rows) console.log('  terse arms: ' + m.terse.real + '/' + m.terse.rows + ' records say terse:true' + (m.terse.real === m.terse.rows ? '  (REAL)' : m.terse.real === 0 ? '  *** SHAM - the manipulation never applied ***' : '  *** MIXED ***'))
  console.log('  from: ' + m.dirs.join(', '))
  if (m.runs !== m.cells.size) problems.push(model + ': ' + (m.runs - m.cells.size) + ' re-run records')
  if (arms.length < 10) problems.push(model + ': only ' + arms.length + ' arms')
  if (lo !== hi) problems.push(model + ': unbalanced, ' + lo + '..' + hi)
  if (m.noGateway) problems.push(model + ': ' + m.noGateway + ' runs without gateway usage')
  if (m.terse.rows && m.terse.real !== m.terse.rows) problems.push(model + ': terse manipulation not applied on all arms')
}

console.log('')
console.log('--- flagged ---')
console.log(problems.length ? problems.map((x) => '  * ' + x).join('\n') : '  nothing flagged')
const ji = process.argv.indexOf('--json')
if (ji >= 0) {
  const path = process.argv[ji + 1] ?? 'analysis/coverage.json'
  const { mkdirSync, writeFileSync } = await import('node:fs')
  mkdirSync(path.split(/[\\/]/).slice(0, -1).join('/') || '.', { recursive: true })
  writeFileSync(path, JSON.stringify({ generated: new Date().toISOString(), models: Object.fromEntries(Object.entries(models).map(([k, v]) => [k, { ...v, tasks: v.tasks.size, seeds: [...v.seeds], cells: v.cells.size }])) }, null, 1))
  console.log('wrote ' + path)
}
