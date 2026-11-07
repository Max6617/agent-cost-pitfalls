/**
 * test-edit-sensitivity.mjs - the two sensitivities PRE-REGISTRATION.md section 12.8 declares.
 *
 * WHY A SEPARATE TOOL. The rule implemented here was pre-declared on 2026-10-04 (commit b9cbe19)
 * BEFORE these numbers were computed, because at journal tier a reporting rule chosen after
 * seeing the effect is fatal. This module reads runs.jsonl and nothing else. It writes exactly one
 * file, and the default path is deliberately NOT either of the two seven-model witnesses in
 * analysis/ (see notes/records/STEP2-RECONCILIATION.md section 2).
 *
 * WHAT IT REPORTS, per model and per arm:
 *   asMeasured  every run, exactly as recorded. THIS IS THE REPORTED FIGURE.
 *   s1          the same rate over runs whose graded suite was NOT edited.
 *   s2          every edited run forced to solved=false. Weakening a graded suite can only move
 *               unsolved -> solved, so s2 is a valid one-sided lower bound, and (s2, asMeasured)
 *               brackets the true rate.
 *
 * The three travel together. Printing one without the others is not using this tool.
 *
 * Run: node tools/test-edit-sensitivity.mjs [--json <path>] [--results <dir>]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DATASETS = ['ds-full', 'glm-flash', 'luna-full', 'qwen-full', 'haiku-full', 'sonnet-full']
export const DEFAULT_OUT = 'analysis/test-edit-sensitivity-6model-2026-10-04.json'

const isEdited = (r) => !!(r.fixture && r.fixture.gradedOnEditedTests === true)
const isUnknown = (r) => !r.fixture
const rate = (solved, n) => (n === 0 ? null : solved / n)

function figures (records) {
  const edited = records.filter(isEdited)
  const unknown = records.filter(isUnknown)
  const honest = records.filter((r) => !isEdited(r))
  const solved = records.filter((r) => r.solved === true).length
  const solvedEdited = edited.filter((r) => r.solved === true).length
  const solvedHonest = solved - solvedEdited
  const measured = records.length > 0 && unknown.length < records.length
  return {
    runs: records.length,
    solved,
    edited: edited.length,
    unedited: records.length - edited.length - unknown.length,
    unknown: unknown.length,
    measured,
    note: measured ? null : 'fixture field absent on every record: incidence NOT measured, never report 0%',
    asMeasured: { n: records.length, solved, rate: rate(solved, records.length) },
    s1: { n: honest.length, solved: solvedHonest, rate: rate(solvedHonest, honest.length) },
    s2: { n: records.length, solved: solvedHonest, rate: rate(solvedHonest, records.length) },
  }
}

/** Pure: records in, the three figures out. No I/O, no clock, no RNG, order-independent. */
export function computeSensitivity (records) {
  const groups = new Map()
  for (const r of records) {
    if (!groups.has(r.arm)) groups.set(r.arm, [])
    groups.get(r.arm).push(r)
  }
  const byArm = {}
  for (const [arm, rs] of groups) byArm[arm] = figures(rs)
  return { ...figures(records), byArm }
}

export function loadDataset (resultsDir, id) {
  const path = join(resultsDir, id, 'runs.jsonl')
  let text
  try { text = readFileSync(path, 'utf8') } catch (e) {
    // A missing dataset is not an absent effect. Refuse, with the path, rather than print a zero.
    throw new Error('missing input: ' + path + ' (' + (e.code ?? e.message) + ')')
  }
  return text.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
}

export function buildPanel (resultsDir = 'results') {
  const models = {}
  for (const id of DATASETS) models[id] = computeSensitivity(loadDataset(resultsDir, id))
  return models
}

function cli () {
  const argv = process.argv.slice(2)
  const opt = (name, dflt) => { const i = argv.indexOf(name); return i === -1 ? dflt : argv[i + 1] }
  const out = opt('--json', DEFAULT_OUT)
  const resultsDir = opt('--results', 'results')
  let panel
  try { panel = buildPanel(resultsDir) } catch (e) { console.error('test-edit-sensitivity: ' + e.message); process.exit(2) }
  const doc = {
    generated: new Date().toISOString(),
    rule: 'PRE-REGISTRATION.md section 12.8 (amendment 21): report as measured, no exclusion, no restoration; S1 and S2 reported in full for all six models and all ten arms.',
    datasets: panel,
  }
  writeFileSync(out, JSON.stringify(doc, null, 1))
  const pct = (x) => (x === null ? 'n/a' : (100 * x).toFixed(1) + '%')
  console.log('test-edit sensitivity - as measured, and the two pre-declared sensitivities')
  console.log('  dataset          runs  edited  unknown  asMeasured        S1 (drop edited)   S2 (bound)')
  for (const id of DATASETS) {
    const s = panel[id]
    const cell = (f) => pct(f.rate) + ' (' + f.solved + '/' + f.n + ')'
    console.log('  ' + id.padEnd(16) + String(s.runs).padStart(4) + String(s.edited).padStart(8) +
      String(s.unknown).padStart(9) + '  ' + cell(s.asMeasured).padEnd(17) + ' ' + cell(s.s1).padEnd(18) + ' ' + cell(s.s2))
  }
  console.log('')
  console.log('  asMeasured is the reported figure. S1 and S2 travel with it; neither may replace it.')
  console.log('  wrote ' + out)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) cli()
