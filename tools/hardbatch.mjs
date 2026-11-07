/**
 * hardbatch.mjs - does the hard-task batch actually discriminate between harnesses?
 *
 * F17 asked this after checking 2 of 24 tasks and said plainly that 2 of 24 is not enough to
 * characterise the batch. This is the full answer, on one model, all 24 tasks, all 7 arms.
 *
 * Three outcomes matter and a single "spread" number conflates them:
 *   TOO EASY   every arm solves it   -> contributes variance and no signal
 *   TOO HARD   no arm solves it      -> same, from the other end
 *   THRESHOLD  most assertions pass, few or no arms cross the all-or-nothing line
 *              -> this is the category F18 identified, and the only one where the binary
 *                 verdict separates models that partial credit does not
 *
 *   node tools/hardbatch.mjs                 # every hard batch present
 *   node tools/hardbatch.mjs results/hardbatch-deepseek
 */
import { readFileSync, existsSync } from 'node:fs'
import { classifyRun } from './exclusions.mjs'

const DIRS = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const BATCHES = DIRS.length ? DIRS.map((d) => ({ dir: d, label: d.replace(/^results\//, '') })) : [
  { dir: 'results/hardbatch-deepseek', label: 'DeepSeek V4.1 Flash' },
  { dir: 'results/hardbatch-glm', label: 'GLM-5.3-Flash' },
  { dir: 'results/hardbatch-qwen-fixed', label: 'Qwen3.8-Flash (fixed path)' },
]

const DISCRIMINATING_PP = 30

for (const b of BATCHES) {
  const p = b.dir + '/runs.jsonl'
  if (!existsSync(p)) { console.log('\n=== ' + b.label + ' === (not run yet)'); continue }
  const rows = readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  // One record per (task, arm, seed); a re-run is averaged in spirit, but these batches have none.
  const byTask = new Map()
  let excluded = 0
  for (const r of rows) {
    if (classifyRun(r).infrastructure) { excluded++; continue }
    if (!byTask.has(r.task)) byTask.set(r.task, [])
    byTask.get(r.task).push(r)
  }
  console.log('')
  console.log('=== ' + b.label + ' ===  ' + rows.length + ' records, ' + excluded + ' infrastructure-excluded, ' +
    byTask.size + ' tasks')
  console.log('  ' + 'task'.padEnd(34) + 'solved'.padStart(8) + 'spread'.padStart(8) + 'mean passRate'.padStart(15) + '   class')

  const table = []
  for (const [task, xs] of byTask) {
    const byArm = new Map()
    for (const x of xs) byArm.set(x.arm, x.solved)
    const vals = [...byArm.values()]
    const solved = vals.filter(Boolean).length
    const spread = 100 * (Math.max(...vals.map(Number)) - Math.min(...vals.map(Number)))
    const prs = xs.map((x) => x.passRate).filter((v) => v != null)
    const passRate = prs.length ? prs.reduce((a, c) => a + c, 0) / prs.length : null
    let cls
    if (solved === vals.length) cls = 'TOO EASY'
    else if (solved === 0) cls = passRate != null && passRate >= 0.5 ? 'THRESHOLD (all fail)' : 'TOO HARD'
    else cls = spread >= DISCRIMINATING_PP ? 'DISCRIMINATING' : 'weak separation'
    table.push({ task, solved, n: vals.length, spread, passRate, cls })
  }
  table.sort((a, c) => c.spread - a.spread || (c.passRate ?? 0) - (a.passRate ?? 0))
  for (const r of table) {
    console.log('  ' + r.task.padEnd(34) + (r.solved + '/' + r.n).padStart(8) + (r.spread + 'pp').padStart(8) +
      (r.passRate == null ? '-' : (100 * r.passRate).toFixed(1) + '%').padStart(15) + '   ' + r.cls)
  }
  const g = (c) => table.filter((r) => r.cls.startsWith(c)).length
  const disc = table.filter((r) => r.spread >= DISCRIMINATING_PP).length
  console.log('')
  console.log('  DISCRIMINATING (>=' + DISCRIMINATING_PP + 'pp spread): ' + disc + '/' + table.length +
    '   too easy: ' + g('TOO EASY') + '   too hard: ' + g('TOO HARD') + '   threshold: ' + g('THRESHOLD') +
    '   weak: ' + g('weak'))
  console.log('  -> ' + (table.length - disc) + ' of ' + table.length + ' hard tasks separate no two arms on this model.')
}
console.log('')
console.log('NOTE. A task with a high mean passRate and zero solves is not broken, it is a THRESHOLD')
console.log('task: every arm gets most assertions and none crosses the line. Those are the tasks')
console.log('where the all-or-nothing verdict carries information that partial credit does not.')
