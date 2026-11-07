import test from 'node:test'
import assert from 'node:assert/strict'
import { planMigrations } from '../src/index.js'

test('a destructive operation nobody acknowledged blocks the release', () => {
  const plan = planMigrations([
    { id: 'm-1', operation: { kind: 'drop-column', table: 'orders', column: 'legacy_code' } },
  ])

  assert.equal(plan.status, 'unacknowledged-destructive')
  assert.equal(plan.errors.length, 1)
  assert.equal(plan.errors[0].migration, 'm-1')
  assert.deepEqual(plan.steps, [])
})

test('an acknowledged destructive operation is planned, with a warning', () => {
  const plan = planMigrations([
    { id: 'm-1', operation: { kind: 'drop-table', table: 'audit_old' }, acknowledgement: 'drop-table' },
  ])

  assert.equal(plan.status, 'ok')
  assert.deepEqual(plan.steps.map((step) => step.id), ['m-1'])
  assert.deepEqual(plan.warnings.map((warning) => warning.code), ['acknowledged-destructive'])
  assert.equal(plan.warnings[0].migration, 'm-1')
})

test('a destructive operation is destructive whatever case the ticket used', () => {
  const plan = planMigrations([
    { id: 'm-1', operation: { kind: 'Drop-Table', table: 'audit_old' } },
  ])

  assert.equal(plan.status, 'unacknowledged-destructive')
  assert.equal(plan.errors[0].migration, 'm-1')
})
