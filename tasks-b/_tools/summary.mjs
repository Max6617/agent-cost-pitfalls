#!/usr/bin/env node
/**
 * summary — the batch's measurement table, from verify-task itself.
 *
 * Every row is produced by running the real gate, not by trusting a NOTES.md:
 * hidden case count, fixture shape, the fraction the untouched fixture scores
 * (the floor), the fraction the reference scores (the ceiling), and how many
 * files a correct solution has to touch. The stratum comes from the id prefix.
 *
 *   node tasks-b/_tools/summary.mjs            # markdown table
 *   node tasks-b/_tools/summary.mjs --json     # the same rows as JSON
 */
import { readdirSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const batchRoot = resolve(here, '..')
const verify = join(here, 'verify-task.mjs')
const json = process.argv.includes('--json')

const STRATUM = (id) =>
  id.startsWith('lh-') ? 'long-horizon'
  : id.startsWith('spec-') ? 'spec-implementation'
  : id.startsWith('cross-') ? 'cross-cutting'
  : id.startsWith('edge-') ? 'edge-case-dense'
  : 'other'

const ids = readdirSync(batchRoot).filter((d) => existsSync(join(batchRoot, d, 'task.json'))).sort()
const rows = []
for (const id of ids) {
  const r = spawnSync(process.execPath, [verify, id], { encoding: 'utf8', timeout: 600000 })
  const out = (r.stdout ?? '') + (r.stderr ?? '')
  const cases = [...out.matchAll(/^\s+suite \S+\s+(\d+) cases$/gm)].reduce((n, m) => n + Number(m[1]), 0)
  const files = (out.match(/^\s+suite /gm) ?? []).length
  const shape = out.match(/fixture: (\d+) text files, (\d+) lines/)
  const broken = out.match(/broken: visible (\d+)\/(\d+) pass \(exit (\d+)\), hidden (\d+)\/(\d+) = (\d+)%/)
  const fixed = out.match(/fixed : visible (\d+)\/(\d+) pass \(exit (\d+)\), hidden (\d+)\/(\d+) = (\d+)%/)
  const changed = out.match(/reference changes (\d+) file\(s\)/)
  rows.push({
    id, stratum: STRATUM(id), cases, files,
    textFiles: shape ? Number(shape[1]) : null, lines: shape ? Number(shape[2]) : null,
    brokenHidden: broken ? Number(broken[4]) : null,
    brokenFloor: broken ? Number(broken[6]) / 100 : null,
    brokenVisiblePass: broken ? Number(broken[1]) : null,
    brokenVisibleTotal: broken ? Number(broken[2]) : null,
    fixedHidden: fixed ? Number(fixed[4]) : null,
    fixedVisibleExit: fixed ? Number(fixed[3]) : null,
    changedFiles: changed ? Number(changed[1]) : null,
    ok: /\.\.\. ok$/.test(out.trim().split('\n').pop() ?? '') || /\.\.\. ok/.test(out),
  })
}

if (json) { console.log(JSON.stringify(rows, null, 2)); process.exit(0) }

const strata = ['long-horizon', 'spec-implementation', 'cross-cutting', 'edge-case-dense']
console.log('| task | stratum | hidden cases | fixture | untouched | reference | files changed |')
console.log('|---|---|---:|---|---:|---:|---:|')
for (const s of strata) {
  for (const r of rows.filter((x) => x.stratum === s)) {
    console.log('| `' + r.id + '` | ' + r.stratum + ' | ' + r.cases + ' | ' + r.textFiles + ' files / ' + r.lines + ' lines | ' +
      (r.brokenHidden === null ? '?' : r.brokenHidden + '/' + r.cases + ' = ' + Math.round((r.brokenFloor ?? 0) * 100) + '%') + ' | ' +
      (r.fixedHidden === null ? '?' : r.fixedHidden + '/' + r.cases + ' = 100%') + ' | ' + r.changedFiles + ' |')
  }
}
const floors = rows.map((r) => r.brokenFloor).filter((v) => v !== null)
const total = rows.reduce((n, r) => n + r.cases, 0)
console.log('')
console.log(rows.length + ' tasks, ' + total + ' hidden cases; floor ' +
  Math.round(Math.min(...floors) * 100) + '-' + Math.round(Math.max(...floors) * 100) + '% (mean ' +
  Math.round((floors.reduce((a, b) => a + b, 0) / floors.length) * 100) + '%)')
console.log('all ok: ' + rows.every((r) => r.ok) + '   strata: ' + strata.map((s) => s + ' ' + rows.filter((r) => r.stratum === s).length).join(', '))
