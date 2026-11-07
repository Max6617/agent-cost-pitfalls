#!/usr/bin/env node
/**
 * score-report — the fraction of hidden cases each arm passed, from a run log.
 *
 * check-task and run-experiment both record solved/not-solved, and with a hidden
 * suite that is a 100%-or-nothing flag: it cannot show the difference between a
 * solution that got 13 of 22 cases and one that got 19. That difference is the
 * whole point of this batch, so read it out of the TASKSCORE line the grader
 * prints at the end of testOutputTail.
 *
 *   node tasks-b/_tools/score-report.mjs results/check-lh-ledger-replay
 *   node tasks-b/_tools/score-report.mjs results/check-lh-ledger-replay --by-seed
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2] ?? 'results'
const bySeed = process.argv.includes('--by-seed')
const runsPath = existsSync(join(dir, 'runs.jsonl')) ? join(dir, 'runs.jsonl') : dir
if (!existsSync(runsPath)) { console.error('no run log at ' + runsPath); process.exit(2) }

const runs = readFileSync(runsPath, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
if (!runs.length) { console.error('no records in ' + runsPath); process.exit(2) }

function scoreOf(r) {
  const m = String(r.testOutputTail ?? '').match(/TASKSCORE (\{.*?\})/)
  if (!m) return null
  try { return JSON.parse(m[1]) } catch { return null }
}

const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const k = s.length >> 1
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2 }

const arms = [...new Set(runs.map((r) => r.arm))]
console.log(runsPath + '  (' + runs.length + ' runs, tasks: ' + [...new Set(runs.map((r) => r.task))].join(', ') + ')')
console.log('')
console.log('  ' + 'arm'.padEnd(20) + 'n'.padStart(3) + 'scored'.padStart(8) + 'solved'.padStart(8) + 'mean'.padStart(8) + 'median'.padStart(9) + '  per-seed cases passed / authored')
for (const a of arms) {
  const rs = runs.filter((r) => r.arm === a)
  const sc = rs.map(scoreOf)
  const got = sc.filter(Boolean)
  const solved = rs.filter((r) => r.solved).length
  const mean = got.length ? got.reduce((s, g) => s + g.score, 0) / got.length : null
  const details = rs.map((r, i) => sc[i] ? sc[i].pass + '/' + sc[i].authored : (r.error ? 'err' : '-')).join('  ')
  console.log('  ' + a.padEnd(20) + String(rs.length).padStart(3) + String(got.length).padStart(8) + String(solved).padStart(8) +
    (mean === null ? '   n/a' : ((mean * 100).toFixed(0) + '%').padStart(8)) +
    (got.length ? ((med(got.map((g) => g.score)) * 100).toFixed(0) + '%').padStart(9) : '      n/a'.padStart(9)) +
    '  ' + details)
  if (bySeed) for (const r of rs) { const g = scoreOf(r); console.log('      seed ' + r.seed + ' seed-pos ' + r.position + '  ' + (g ? g.pass + '/' + g.authored : '-') + (g?.note ? '  (' + g.note + ')' : '')) }
}

// the interesting middle: do the arms land on the same fraction?
const means = arms.map((a) => { const g = runs.filter((r) => r.arm === a).map(scoreOf).filter(Boolean); return g.length ? g.reduce((s, x) => s + x.score, 0) / g.length : null }).filter((v) => v !== null)
if (means.length > 1) {
  console.log('')
  console.log('  fraction-passed spread: ' + ((Math.max(...means) - Math.min(...means)) * 100).toFixed(0) + ' points')
}
const unscored = runs.filter((r) => !scoreOf(r)).length
if (unscored) console.log('  NOTE: ' + unscored + ' run(s) have no TASKSCORE line - check the grader ran at all')
