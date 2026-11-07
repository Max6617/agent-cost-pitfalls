import test from 'node:test'
import assert from 'node:assert/strict'
import { planMigrations } from '../src/index.js'

test('preparing a table is charged once per table, not once per step', () => {
  const plan = planMigrations([
    { id: 'm-1', operation: { kind: 'add-column', table: 'orders', column: 'region' } },
    { id: 'm-2', operation: { kind: 'create-index', table: 'orders', column: 'region' } },
    { id: 'm-3', operation: { kind: 'add-column', table: 'customers', column: 'tier' } },
  ])

  assert.equal(plan.status, 'ok')
  assert.equal(plan.estimate.setupMs, 3000)
  assert.equal(plan.estimate.totalMs, plan.estimate.setupMs + plan.estimate.stepsMs)
})
