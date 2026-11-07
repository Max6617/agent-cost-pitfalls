import { readFileSync, existsSync } from 'node:fs'
import { indexByRun } from './attribute.mjs'
// Measured per-run costs for the GLM models, from the runs we already have.
function perRun(gwP, runsP) {
  if (!existsSync(runsP) || !existsSync(gwP)) return null
  const gw = readFileSync(gwP, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  const { byRun } = indexByRun(gw)
  const runs = readFileSync(runsP, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  let c = 0, n = 0
  for (const r of runs) { const q = byRun.get(r.runId) ?? []; if (!q.length) continue; n++; for (const x of q) c += x.cost?.billedUsd ?? 0 }
  return n ? c / n : null
}
// merge both glm gateway logs, since the two matrices logged to different files
const gwAll = []
for (const f of ['results/glm-gateway.jsonl', 'results/glm53-gateway.jsonl']) {
  if (!existsSync(f)) continue
  for (const l of readFileSync(f, 'utf8').split('\n')) { if (l.trim()) { try { gwAll.push(JSON.parse(l)) } catch {} } }
}
const { byRun } = indexByRun(gwAll)
function perRun2(runsP) {
  const runs = readFileSync(runsP, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  let c = 0, n = 0, quota = 0
  for (const r of runs) {
    if (/QUOTA|Insufficient Balance/i.test((r.stderrTail ?? '') + (r.stdoutTail ?? ''))) { quota++; continue }
    const q = byRun.get(r.runId) ?? []; if (!q.length) continue
    n++; for (const x of q) c += x.cost?.billedUsd ?? 0
  }
  return { per: n ? c / n : null, n, quota }
}
const fl = perRun2('results/glm-flash/runs.jsonl')
const f53 = perRun2('results/glm53/runs.jsonl')
const tr = perRun2('results/glm-terse/runs.jsonl')
console.log('MEASURED per-run cost (old card; the corrected card changes absolutes but not ratios)')
console.log('  glm-5.3-flash : $' + (fl.per ?? 0).toFixed(5) + '   (' + fl.n + ' runs)')
console.log('  glm-5.3-flash terse: $' + (tr.per ?? 0).toFixed(5) + '   (' + tr.n + ' runs)')
console.log('  glm-5.3       : $' + (f53.per ?? 0).toFixed(5) + '   (' + f53.n + ' runs, ' + f53.quota + ' quota-lost)')
console.log('')
// Design: 10 arms (6 dsh + opencode, cline, goose, openhands), 31 tasks
const ARMS = 10, TASKS = 31
const have53 = new Set(readFileSync('results/glm53/runs.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l).task } catch { return null } }).filter(Boolean))
const haveArms53 = new Set(readFileSync('results/glm53/runs.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l).arm } catch { return null } }).filter(Boolean))
console.log('GLM-5.3 coverage now: ' + have53.size + ' tasks, ' + haveArms53.size + ' arms')
console.log('')
console.log('WHAT EACH OPTION COSTS, at $' + (f53.per ?? 0.1).toFixed(5) + '/run:')
for (const [label, runs] of [
  ['full: ' + ARMS + ' arms x 31 tasks x 2 seeds', ARMS * TASKS * 2],
  ['1 seed: ' + ARMS + ' arms x 31 tasks', ARMS * TASKS],
  ['core 6 arms x 31 x 2', 6 * TASKS * 2],
  ['core 6 arms x 31 x 1', 6 * TASKS],
]) console.log('  ' + label.padEnd(38) + String(runs).padStart(4) + ' runs   $' + (runs * (f53.per ?? 0.1)).toFixed(2))
console.log('')
// GLM-5.3-Flash still needs the three new harnesses
const needFl = 3 * TASKS * 2
console.log('GLM-5.3-Flash still needs cline/goose/openhands: ' + needFl + ' runs   $' + (needFl * (fl.per ?? 0.008)).toFixed(2))