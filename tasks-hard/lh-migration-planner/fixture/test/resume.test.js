import test from 'node:test'
import assert from 'node:assert/strict'
import { planMigrations, applyPlan, resumeFrom } from '../src/index.js'

// A plain chain, so that what these cases reproduce is the resume behaviour and
// not the order the tickets happen to be written in.
const release = () => [
  { id: 'm-1', operation: { kind: 'add-column', table: 'orders', column: 'region' } },
  { id: 'm-2', requires: ['m-1'], operation: { kind: 'backfill', table: 'orders' }, rows: 10000, batchSize: 5000 },
  { id: 'm-3', requires: ['m-2'], operation: { kind: 'add-constraint', table: 'orders' } },
  { id: 'm-4', requires: ['m-3'], operation: { kind: 'create-index', table: 'orders' } },
]

test('a run that stopped half way resumes at the step that failed', () => {
  const migrations = release()
  const plan = planMigrations(migrations)
  const run = applyPlan(plan, { failAt: 'm-3' })

  assert.deepEqual(run.applied, ['m-1', 'm-2'])
  assert.equal(run.failed, 'm-3')

  const rest = resumeFrom(run, migrations)
  assert.deepEqual(rest.steps.map((step) => step.id), ['m-3', 'm-4'])
  assert.deepEqual(rest.skipped, ['m-1', 'm-2'])
})

test('a run that finished has nothing left to plan', () => {
  const migrations = release()
  const plan = planMigrations(migrations)
  const run = applyPlan(plan)

  assert.equal(run.failed, null)
  assert.deepEqual(run.applied, ['m-1', 'm-2', 'm-3', 'm-4'])

  const rest = resumeFrom(run, migrations)
  assert.deepEqual(rest.steps, [])
  assert.deepEqual(rest.skipped, ['m-1', 'm-2', 'm-3', 'm-4'])
})
