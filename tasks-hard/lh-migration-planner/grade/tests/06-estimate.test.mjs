// Sub-problem 6: what a step costs, what the plan costs, and the rollback plan.
import test from 'node:test'
import assert from 'node:assert/strict'
import { planMigrations } from '../src/index.js'

test('a step costs overhead, batch overhead and rounded-up row work', () => {
  const plan = planMigrations([
    { id: 'm-1', operation: { kind: 'backfill', table: 'orders', column: 'region' }, rows: 20000, batchSize: 5000 },
    { id: 'm-2', operation: { kind: 'add-column', table: 'orders', column: 'note' } },
  ])

  assert.equal(plan.status, 'ok')
  assert.equal(plan.steps[0].batches.length, 4)
  assert.equal(plan.steps[0].estimateMs, 1290)
  assert.equal(plan.steps[1].estimateMs, 250)
})

test('table preparation is charged once per table, whatever touches it', () => {
  const plan = planMigrations([
    { id: 'm-1', operation: { kind: 'add-column', table: 'orders', column: 'region' } },
    { id: 'm-2', operation: { kind: 'create-index', table: 'orders', column: 'region' } },
    { id: 'm-3', operation: { kind: 'add-column', table: 'customers', column: 'tier' } },
  ])

  assert.equal(plan.status, 'ok')
  assert.deepEqual(plan.estimate, { setupMs: 3000, stepsMs: 750, totalMs: 3750 })
})

test('an irreversible step is left out of the rollback and reported', () => {
  const plan = planMigrations([
    { id: 'm-1', operation: { kind: 'add-column', table: 'orders', column: 'region' } },
    {
      id: 'm-2',
      operation: { kind: 'rewrite-type', table: 'customers', column: 'tier' },
      reversible: false,
      acknowledgement: 'rewrite-type',
    },
    { id: 'm-3', operation: { kind: 'add-column', table: 'orders', column: 'note' } },
  ])

  assert.equal(plan.status, 'ok')
  assert.deepEqual(plan.rollback.steps.map((step) => step.id), ['m-3', 'm-1'])
  assert.deepEqual(plan.rollback.skipped, ['m-2'])
})

test('the rollback undoes the plan order, not the order the tickets were written in', () => {
  const plan = planMigrations([
    { id: 'm-a', operation: { kind: 'add-column', table: 'orders', column: 'region' } },
    { id: 'm-c', requires: ['m-b'], operation: { kind: 'add-constraint', table: 'orders' } },
    { id: 'm-b', requires: ['m-a'], reversible: false, operation: { kind: 'create-index', table: 'orders', column: 'region' } },
    { id: 'm-d', requires: ['m-c'], operation: { kind: 'add-constraint', table: 'orders' } },
  ])

  assert.equal(plan.status, 'ok')
  assert.deepEqual(plan.steps.map((step) => step.id), ['m-a', 'm-b', 'm-c', 'm-d'])
  assert.deepEqual(plan.rollback.steps.map((step) => step.id), ['m-d', 'm-c', 'm-a'])
  assert.deepEqual(plan.rollback.skipped, ['m-b'])
})
