// Sub-problem 3: destructive operations and the acknowledgements that let them
// through, including a destructive operation that is also a batched backfill.
import test from 'node:test'
import assert from 'node:assert/strict'
import { planMigrations } from '../src/index.js'

test('a destructive operation is destructive whatever case the ticket used', () => {
  const plan = planMigrations([
    { id: 'm-1', operation: { kind: 'Drop-Table', table: 'audit_old' } },
  ])

  assert.equal(plan.status, 'unacknowledged-destructive')
  assert.equal(plan.errors.length, 1)
  assert.equal(plan.errors[0].code, 'unacknowledged-destructive')
  assert.equal(plan.errors[0].migration, 'm-1')
  assert.deepEqual(plan.steps, [])
})

test('an acknowledgement for a different operation is not an acknowledgement', () => {
  const plan = planMigrations([
    {
      id: 'm-1',
      operation: { kind: 'rewrite-type', table: 'orders', column: 'total' },
      acknowledgement: 'drop-column',
    },
  ])

  assert.equal(plan.status, 'unacknowledged-destructive')
  assert.equal(plan.errors[0].migration, 'm-1')
  assert.deepEqual(plan.steps, [])
})

test('the whole plan can acknowledge a destructive operation', () => {
  const plan = planMigrations([
    { id: 'm-1', operation: { kind: 'drop-table', table: 'audit_old' } },
  ], { acknowledgements: ['drop-table'] })

  assert.equal(plan.status, 'ok')
  assert.deepEqual(plan.steps.map((step) => step.id), ['m-1'])
  assert.equal(plan.errors.length, 0)
  assert.deepEqual(plan.warnings.map((warning) => warning.code), ['acknowledged-destructive'])
  assert.equal(plan.warnings[0].migration, 'm-1')
})

test('an acknowledged destructive backfill is flagged and batched like any other', () => {
  const plan = planMigrations([
    {
      id: 'm-1',
      operation: { kind: 'Rewrite-Type', table: 'orders', column: 'total' },
      acknowledgement: 'rewrite-type',
      rows: 20500,
      batchSize: 5000,
    },
  ])

  assert.equal(plan.status, 'ok')
  assert.equal(plan.steps[0].destructive, true)
  assert.equal(plan.steps[0].reversible, true)
  assert.deepEqual(plan.warnings.map((warning) => warning.code), ['acknowledged-destructive'])
  assert.equal(plan.steps[0].batches.length, 5)
  assert.deepEqual(plan.steps[0].batches.map((batch) => batch.rows), [5000, 5000, 5000, 5000, 500])
})

test('an acknowledged destructive step still prepares its table once', () => {
  const plan = planMigrations([
    { id: 'm-1', operation: { kind: 'Drop-Table', table: 'audit_old' }, acknowledgement: 'drop-table' },
    { id: 'm-2', operation: { kind: 'add-column', table: 'audit_old', column: 'note' } },
  ])

  assert.equal(plan.status, 'ok')
  assert.equal(plan.steps[0].destructive, true)
  assert.deepEqual(plan.warnings.map((warning) => warning.code), ['acknowledged-destructive'])
  assert.equal(plan.estimate.setupMs, 1500)
})
