import test from 'node:test'
import assert from 'node:assert/strict'
import { planMigrations } from '../src/index.js'

const column = (id, requires = []) => ({
  id, requires, operation: { kind: 'add-column', table: 'orders' },
})

test('a release declared in dependency order plans in that order', () => {
  const plan = planMigrations([
    column('m-1'),
    { id: 'm-2', requires: ['m-1'], operation: { kind: 'backfill', table: 'orders' }, rows: 10000, batchSize: 5000 },
    { id: 'm-3', requires: ['m-2'], operation: { kind: 'add-constraint', table: 'orders' } },
  ])

  assert.equal(plan.status, 'ok')
  assert.deepEqual(plan.steps.map((step) => step.id), ['m-1', 'm-2', 'm-3'])
})

test('the export order does not decide the plan order', () => {
  // the tickets were written in proposal order, and m-3 was proposed first
  const plan = planMigrations([
    { id: 'm-3', requires: ['m-2'], operation: { kind: 'add-constraint', table: 'orders' } },
    { id: 'm-2', requires: ['m-1'], operation: { kind: 'backfill', table: 'orders' }, rows: 10000, batchSize: 5000 },
    column('m-1'),
  ])

  assert.equal(plan.status, 'ok')
  assert.deepEqual(plan.steps.map((step) => step.id), ['m-1', 'm-2', 'm-3'])
})

test('a prerequisite nobody declared is reported instead of ignored', () => {
  const plan = planMigrations([
    { id: 'm-1', requires: ['m-gone'], operation: { kind: 'add-column', table: 'orders' } },
  ])

  assert.equal(plan.status, 'missing-dependency')
  assert.equal(plan.errors.length, 1)
  assert.equal(plan.errors[0].migration, 'm-1')
  assert.deepEqual(plan.steps, [])
})
