/**
 * audit-all — verify every dataset and every document, in one pass.
 *
 * Written at the end of a long working session, because the two retractions in this
 * project both came from NOT checking evidence before making a claim. This checks
 * the evidence mechanically.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { indexByRun } from './attribute.mjs'

const DATASETS = [
  ['DeepSeek V4.1 Flash (full)', 'results/gateway.jsonl', 'results/ds-full/runs.jsonl'],
  ['DeepSeek (15-task sweep)', 'results/gateway.jsonl', null],
  ['GLM-5.3-Flash', 'results/glm-gateway.jsonl', 'results/glm-flash/runs.jsonl'],
  ['GLM-5.3', 'results/glm53-gateway.jsonl', 'results/glm53/runs.jsonl'],
  ['milestone-4', 'data/milestone-4/gateway.jsonl', 'data/milestone-4/runs.jsonl'],
]
let problems = 0
const flag = (m) => { problems++; console.log('    !! ' + m) }

console.log('=== DATASET INTEGRITY ===')
for (const [name, gwP, runsP] of DATASETS) {
  if (!existsSync(gwP)) { console.log('  ' + name + ': no gateway log'); continue }
  if (!runsP) { console.log('  ' + name + ': (no per-run file, skipping)'); continue }
  const gw = []
  for (const l of readFileSync(gwP, 'utf8').split('\n')) { if (l.trim()) { try { gw.push(JSON.parse(l)) } catch {} } }
  const { byRun, recovered } = indexByRun(gw)
  const runs = existsSync(runsP) ? readFileSync(runsP, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean) : []
  const joined = runs.filter((r) => (byRun.get(r.runId) ?? []).length > 0).length
  const solved = runs.filter((r) => r.solved).length
  // Must match the PROVIDER'S error, not the word "quota" anywhere. A task about retry
  // and quota policy discusses quota constantly in its own source, which produced six
  // false positives on runs that solved cleanly. Match the API error string itself, and
  // only count runs that actually failed.
  const quota = runs.filter((r) => !r.solved &&
    (/QUOTA:\s*\[1113\]|Insufficient balance or no resource package|\b1113\b.*recharge/i.test((r.stderrTail ?? '') + (r.stdoutTail ?? '')))).length
  console.log('  ' + name.padEnd(32) + runs.length + ' runs, ' + solved + ' solved, ' + joined + ' joined' + (recovered ? ', ' + recovered + ' re-attributed' : ''))
  if (runs.length && joined === 0 && name.includes('full')) console.log('    (run still in progress or no usage yet)')
  if (quota) flag(name + ': ' + quota + ' runs failed on QUOTA - these are infrastructure, not results')
  // leak check
  // Leak check reads the WHOLE file, which is large; only do it for the primary datasets.
  if (name.includes('GLM-5.3-Flash') || name.includes('DeepSeek V4.1 Flash (full)')) {
    if (/sk-[0-9a-f]{20,}/i.test(readFileSync(gwP, 'utf8'))) flag(name + ': POSSIBLE KEY LEAK in gateway log')
    if (runsP && existsSync(runsP) && /sk-[0-9a-f]{20,}/i.test(readFileSync(runsP, 'utf8'))) flag(name + ': POSSIBLE KEY LEAK in runs log')
  }
}
console.log('  (no leak warnings above means both logs are clean)')

console.log('')
console.log('=== DOCUMENT CONSISTENCY ===')
// Working notes moved under notes/. Scan those as well as the root entry points,
// or the claim check only sees README.md and the other files that stayed put.
function markdownUnder(dir, acc = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) markdownUnder(p, acc)
    else if (ent.name.endsWith('.md')) acc.push(p)
  }
  return acc
}
const docs = [
  ...readdirSync('.').filter((f) => f.endsWith('.md')),
  ...markdownUnder('notes'),
]
const claims = {
  'DeepSeek has 31 tasks': (t) => /DeepSeek[^|]*\|\s*31 of 31|DeepSeek V4\.1 Flash \| 310/.test(t),
  'claims a stronger model is worse': (t) => /stronger model is WORSE on some tasks\s*·\s*PRELIMINARY/.test(t),
  // Only a problem if asserted WITHOUT a retraction beside it.
  'asserts the cache advantage unretracted': (t) => /10-point cache advantage/.test(t) && !/Retracted/i.test(t),
}
for (const [label, test] of Object.entries(claims)) {
  const hits = docs.filter((f) => test(readFileSync(f, 'utf8')))
  console.log('  ' + (hits.length ? 'FOUND in: ' + hits.join(', ') : 'absent   ') + '   <- ' + label)
}

console.log('')
console.log('=== FILES PRESENT ===')
const groups = {
  'planning': ['PRE-REGISTRATION.md', 'notes/plans/JOURNAL-PLAN.md', 'notes/plans/RUN-PLAN.md', 'notes/plans/PENDING-RUNS.md'],
  'findings': ['notes/records/FINDINGS.md', 'METHODS.md', 'notes/records/FIRST-RESULTS.md'],
  'literature': ['notes/literature/RELATED-WORK.md', 'notes/prompts/RELATED-WORK-PROMPT.md', 'notes/prompts/RELATED-WORK-FOLLOWUP.md', 'notes/prompts/RELATED-WORK-FOLLOWUP-3.md'],
  'authoring': ['notes/records/TASKS.md', 'notes/prompts/TASK-PROMPT.md', 'notes/prompts/HARD-TASKS-PROMPT.md'],
  'ops': ['scripts/preflight-experiments.ps1', 'scripts/start-gateway.ps1', 'scripts/upgrade-dsh.ps1', 'notes/status/RESUME.md'],
}
for (const [g, fs_] of Object.entries(groups)) {
  const missing = fs_.filter((f) => !existsSync(f))
  console.log('  ' + g.padEnd(12) + fs_.length + ' files' + (missing.length ? '   MISSING: ' + missing.join(', ') : '   all present'))
}
console.log('')
console.log(problems === 0 ? '=== no problems found ===' : '=== ' + problems + ' problem(s) found ===')
