// Sub-problem 5: resuming a run from what it recorded, including a run that died
// inside a batched step.
import test from 'node:test'
import assert from 'node:assert/strict'
import { planMigrations, applyPlan, resumeFrom } from '../src/index.js'

const chain = () => [
  { id: 'm-1', operation: { kind: 'add-column', table: 'orders', column: 'region' } },
  { id: 'm-2', requires: ['m-1'], operation: { kind: 'backfill', table: 'orders' }, rows: 20000, batchSize: 5000 },
  { id: 'm-3', requires: ['m-2'], operation: { kind: 'add-constraint', table: 'orders' } },
  { id: 'm-4', requires: ['m-3'], operation: { kind: 'create-index', table: 'orders' } },
]

test('a run that failed half way resumes at the step that failed and re-emits the rest', () => {
  const migrations = chain()
  const run = applyPlan(planMigrations(migrations), { failAt: 'm-3' })

  assert.deepEqual(run.applied, ['m-1', 'm-2'])
  assert.equal(run.failed, 'm-3')

  const rest = resumeFrom(run, migrations)
  assert.deepEqual(rest.steps.map((step) => step.id), ['m-3', 'm-4'])
  assert.deepEqual(rest.skipped, ['m-1', 'm-2'])
})

test('a run that finished has nothing left to plan', () => {
  const migrations = chain()
  const run = applyPlan(planMigrations(migrations))

  assert.equal(run.failed, null)
  assert.deepEqual(run.applied, ['m-1', 'm-2', 'm-3', 'm-4'])

  const rest = resumeFrom(run, migrations)
  assert.deepEqual(rest.steps, [])
  assert.deepEqual(rest.skipped, ['m-1', 'm-2', 'm-3', 'm-4'])
})

test('a migration from an older release in the record is ignored, not counted', () => {
  const migrations = chain()
  const rest = resumeFrom({ applied: ['m-1', 'm-older-release-1'], failed: null }, migrations)

  assert.deepEqual(rest.skipped, ['m-1'])
  assert.deepEqual(rest.steps.map((step) => step.id), ['m-2', 'm-3', 'm-4'])
})

test('a batched step that failed is planned again from its first batch', () => {
  const migrations = [
    { id: 'm-1', operation: { kind: 'add-column', table: 'orders', column: 'region' } },
    { id: 'm-2', requires: ['m-1'], operation: { kind: 'backfill', table: 'orders' }, rows: 20500, batchSize: 5000 },
    { id: 'm-3', requires: ['m-2'], operation: { kind: 'add-constraint', table: 'orders' } },
  ]
  const run = applyPlan(planMigrations(migrations), { failAt: 'm-2' })

  assert.deepEqual(run.applied, ['m-1'])
  assert.equal(run.failed, 'm-2')

  const rest = resumeFrom(run, migrations)
  assert.deepEqual(rest.steps.map((step) => step.id), ['m-2', 'm-3'])
  assert.deepEqual(rest.skipped, ['m-1'])
  // no progress inside a step is recorded, so the whole batch list comes back
  assert.equal(rest.steps[0].batches.length, 5)
  assert.deepEqual(rest.steps[0].batches.map((batch) => batch.rows), [5000, 5000, 5000, 5000, 500])
})
