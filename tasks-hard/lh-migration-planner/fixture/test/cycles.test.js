import test from 'node:test'
import assert from 'node:assert/strict'
import { planMigrations } from '../src/index.js'

test('migrations that rejoin are a diamond, not a cycle', () => {
  const plan = planMigrations([
    { id: 'm-1', operation: { kind: 'add-column', table: 'orders', column: 'region' } },
    { id: 'm-2', requires: ['m-1'], operation: { kind: 'create-index', table: 'orders', column: 'region' } },
    { id: 'm-3', requires: ['m-1'], operation: { kind: 'backfill', table: 'orders', column: 'region' }, rows: 5000, batchSize: 5000 },
    { id: 'm-4', requires: ['m-2', 'm-3'], operation: { kind: 'add-constraint', table: 'orders' } },
  ])

  assert.equal(plan.status, 'ok')
  assert.equal(plan.cycle, null)
  assert.deepEqual(plan.steps.map((step) => step.id), ['m-1', 'm-2', 'm-3', 'm-4'])
})
