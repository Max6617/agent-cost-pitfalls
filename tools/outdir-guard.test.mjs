/**
 * outdir-guard.test.mjs - the ds-full collision, asserted against the real directories.
 *
 * The handover left this defect open: "\`--plan hard\` without \`--name-prefix\` writes into
 * results/ds-full. Do not launch a hard matrix without the prefix until that is fixed." The test
 * below is that fix's acceptance criterion, run against the shipped collection.json files rather
 * than against a fixture - because the hazard was a real directory and a real plan.
 *
 *   node --test tools/outdir-guard.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { outputDirVerdict, readCollection } from './outdir-guard.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const results = join(here, '..', 'results')

test('a fresh directory is fine, and a matching plan is a resume', () => {
  assert.equal(outputDirVerdict({ dir: join(results, 'brand-new-dir'), plan: 'hard' }).ok, true)
  assert.equal(outputDirVerdict({ dir: join(results, 'x'), plan: 'hard', collection: { plan: 'hard' } }).owner, 'hard')
})

test('the collision: plan hard would land in a batch1 matrix', () => {
  const v = outputDirVerdict({
    dir: join(results, 'ds-full'), plan: 'hard', cells: 240, ownerName: 'ds-full', namePrefix: '',
    collection: { plan: 'batch1', matrixId: 'cmuquohyu-deepseek', cells: 620, launchedAt: '2026-10-02T11:02:45.852Z' },
    hasRuns: true,
  })
  assert.equal(v.ok, false)
  assert.equal(v.code, 'plan-mismatch')
  // The message has to name BOTH plans and the remedy, or the next reader re-derives it by hand.
  assert.match(v.message, /plan "batch1"/)
  assert.match(v.message, /plan "hard"/)
  assert.match(v.message, /cmuquohyu-deepseek/)
  assert.match(v.message, /--name-prefix/)
  assert.match(v.message, /results\/ds-full/)
})

test('unknown provenance is refused, not guessed', () => {
  const runsOnly = outputDirVerdict({ dir: join(results, 'rerun-ds'), plan: 'batch1', hasRuns: true, collection: null })
  assert.equal(runsOnly.ok, false)
  assert.equal(runsOnly.code, 'unknown-provenance')
  const noPlan = outputDirVerdict({ dir: join(results, 'x'), plan: 'hard', collection: { matrixId: 'm', cells: 1 } })
  assert.equal(noPlan.ok, false)
  assert.equal(noPlan.code, 'no-recorded-plan')
  const broken = outputDirVerdict({ dir: join(results, 'x'), plan: 'hard', collection: { unreadable: true } })
  assert.equal(broken.ok, false)
  assert.equal(broken.code, 'unreadable-collection')
})

test('REAL DATA: --plan hard into results/ds-full is refused, --plan batch1 is not', () => {
  const dir = join(results, 'ds-full')
  if (!existsSync(join(dir, 'collection.json'))) return
  const collection = readCollection(dir)
  assert.equal(collection.plan, 'batch1')
  const refused = outputDirVerdict({ dir, plan: 'hard', cells: 240, ownerName: 'ds-full', collection, hasRuns: true })
  assert.equal(refused.ok, false, 'the hard plan must not be able to collect into a finished batch1 matrix')
  const allowed = outputDirVerdict({ dir, plan: 'batch1', cells: 620, ownerName: 'ds-full', collection, hasRuns: true })
  assert.equal(allowed.ok, true, 'resuming batch1 into its own directory must still work')
})

test('REAL DATA: the isolated pilot directory still resumes, and every shipped plan owns its own dir', () => {
  const registry = [
    ['ds-full', 'batch1'], ['glm-flash', 'batch1'], ['qwen-full', 'batch1'],
    ['haiku-full', 'batch1'], ['sonnet-full', 'batch1'], ['luna-full', 'batch1'],
    ['hardpilot-ds-full', 'hard'],
  ]
  for (const [name, plan] of registry) {
    const dir = join(results, name)
    if (!existsSync(join(dir, 'collection.json'))) continue
    const collection = readCollection(dir)
    assert.equal(collection.plan, plan, name + ' records the wrong plan')
    assert.equal(outputDirVerdict({ dir, plan, ownerName: name, collection, hasRuns: true }).ok, true,
      name + ' must be resumable by the plan that owns it')
    const other = plan === 'hard' ? 'batch1' : 'hard'
    assert.equal(outputDirVerdict({ dir, plan: other, ownerName: name, collection, hasRuns: true }).ok, false,
      name + ' must refuse the other plan')
  }
})

test('WIRING: collect.mjs checks every output directory before any stage runs', () => {
  const src = readFileSync(join(here, 'collect.mjs'), 'utf8')
  assert.match(src, /from '\.\/outdir-guard\.mjs'/, 'collect.mjs must import the guard')
  assert.match(src, /outputDirVerdict/, 'collect.mjs must call the guard')
  const call = src.indexOf('outputDirVerdict(')
  const firstStage = src.indexOf("stage('plan and cost ceiling'")
  assert.ok(call > 0 && firstStage > 0 && call < firstStage,
    'the guard must run BEFORE the first stage, so that --dry-run catches a collision for free')
  assert.match(src, /if \(!v\.ok\)/, 'a refusal must stop the run')
})

test('STRUCTURAL: the guard cannot modify a directory', () => {
  const src = readFileSync(join(here, 'outdir-guard.mjs'), 'utf8')
  for (const primitive of ['rmSync', 'rmdirSync', 'unlinkSync', 'writeFileSync', 'renameSync', 'mkdirSync', 'appendFileSync']) {
    assert.ok(!src.includes(primitive), 'outdir-guard.mjs must not be able to ' + primitive + ' anything')
  }
})
