/**
 * test-edit-incidence.mjs - the per-arm incidence of the flag tasks-b/PLAN.md section 3 ordered reported.
 *
 * WHY THIS EXISTS. tasks-b/PLAN.md section 3, fixed before any tasks-b run record existed, says:
 * "fixture.gradedOnEditedTests is still recorded on every run and reported per arm". It was recorded
 * on every run and reported nowhere. This tool reports it - per arm, per model, per suite - from the
 * shipped run records, and counts the records on which the field is absent rather than reading
 * absence as "not edited".
 *
 * Usage: node tools/test-edit-incidence.mjs [--json <path>]
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DATASETS } from './cost-panel.mjs'

export function incidence () {
  const suites = { batch1: {}, batchb: {} }
  for (const d of DATASETS) {
    if (!existsSync(d.runs)) continue
    if (d.suite !== 'batch1' && d.suite !== 'batchb') continue
    const rows = readFileSync(d.runs, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
    const arms = {}
    for (const r of rows) {
      const arm = r.arm ?? '(no arm)'
      const a = arms[arm] ?? (arms[arm] = { runs: 0, edited: 0, missingFixture: 0 })
      a.runs++
      const f = r.fixture
      if (f === undefined || f === null) a.missingFixture++
      else if (f.gradedOnEditedTests === true) a.edited++
    }
    const totals = Object.values(arms).reduce((t, a) => ({ runs: t.runs + a.runs, edited: t.edited + a.edited, missingFixture: t.missingFixture + a.missingFixture }), { runs: 0, edited: 0, missingFixture: 0 })
    suites[d.suite][d.id] = { model: d.model, runs: d.runs, totals, arms }
  }
  return suites
}

if (process.argv[1] && process.argv[1].endsWith('test-edit-incidence.mjs')) {
  const argv = process.argv.slice(2)
  const suites = incidence()
  for (const suite of ['batch1', 'batchb']) {
    console.log('')
    console.log('  ' + suite + ' - fixture.gradedOnEditedTests, per arm (edited / runs)')
    for (const [id, d] of Object.entries(suites[suite])) {
      const arms = Object.entries(d.arms).sort((a, b) => b[1].edited - a[1].edited)
      console.log('    ' + id.padEnd(16) + (d.totals.edited + '/' + d.totals.runs).padStart(10) +
        (d.totals.runs ? ' (' + (d.totals.edited / d.totals.runs * 100).toFixed(1) + '%)' : '') +
        (d.totals.missingFixture ? '  ' + d.totals.missingFixture + ' records carry no fixture field' : ''))
      console.log('      ' + arms.map(([a, v]) => a + ' ' + v.edited + '/' + v.runs).join('; '))
    }
  }
  const ji = argv.indexOf('--json')
  const path = ji >= 0 ? (argv[ji + 1] ?? 'analysis/test-edit-incidence.json') : null
  if (path) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify({ generated: new Date().toISOString(), flag: 'fixture.gradedOnEditedTests', rule: 'tasks-b/PLAN.md section 3', suites }, null, 1))
    console.log('')
    console.log('  wrote ' + path)
  }
}
