import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotFixture, diffFixture } from './fixture-guard.mjs'

const tasks = readdirSync('tasks')
const dirs = readdirSync(tmpdir()).filter((d) => d.startsWith('dsh-exp-cmuquohyu-'))
let n = 0, touched = 0, deleted = 0
const rows = []
for (const d of dirs) {
  const wd = join(tmpdir(), d)
  const t = tasks.find((x) => d.includes('-' + x + '-'))
  if (!t) continue
  const fx = join('tasks', t, 'fixture')
  if (!existsSync(fx)) continue
  const before = snapshotFixture(fx)
  const diff = diffFixture(before, wd)
  n++
  const arm = d.replace(/^dsh-exp-cmuquohyu-deepseek-/, '').replace(new RegExp('-' + t + '.*$'), '')
  if (diff.testsTouched.length) { touched++; rows.push({ arm, task: t, touched: diff.testsTouched, deleted: diff.testsDeleted, modified: diff.testsModified, added: diff.testsAdded }) }
  if (diff.testsDeleted.length) deleted++
}
console.log('leftover workdirs examined : ' + n)
console.log('with TEST FILES TOUCHED    : ' + touched + '  (' + (n ? (100 * touched / n).toFixed(1) : '0') + '%)')
console.log('with test files DELETED    : ' + deleted)
const byArm = {}
for (const r of rows) byArm[r.arm] = (byArm[r.arm] || 0) + 1
console.log('by arm: ' + JSON.stringify(byArm))
console.log('')
for (const r of rows.slice(0, 25)) console.log('  ' + r.arm.padEnd(18) + r.task.padEnd(34) + 'mod=' + JSON.stringify(r.modified) + ' del=' + JSON.stringify(r.deleted) + ' add=' + JSON.stringify(r.added))