// Sub-problem 1: plan order, declared-order tie-breaks and missing dependencies.
import test from 'node:test'
import assert from 'node:assert/strict'
import { planMigrations } from '../src/index.js'

const column = (id, requires = []) => ({
  id, requires, operation: { kind: 'add-column', table: 'orders' },
})

test('a prerequisite declared after its dependent still runs first', () => {
  const plan = planMigrations([
    column('m-a'),
    { id: 'm-c', requires: ['m-b'], operation: { kind: 'add-constraint', table: 'orders' } },
    { id: 'm-b', requires: ['m-a'], operation: { kind: 'backfill', table: 'orders' }, rows: 20000, batchSize: 5000 },
    { id: 'm-d', requires: ['m-c'], operation: { kind: 'create-index', table: 'orders' } },
  ])

  assert.equal(plan.status, 'ok')
  assert.deepEqual(plan.steps.map((step) => step.id), ['m-a', 'm-b', 'm-c', 'm-d'])
})

test('migrations that are ready at the same time keep their declared order', () => {
  const plan = planMigrations([
    column('m-a'),
    { id: 'm-b', operation: { kind: 'create-index', table: 'orders' } },
    { id: 'm-c', requires: ['m-a'], operation: { kind: 'add-constraint', table: 'orders' } },
  ])

  assert.equal(plan.status, 'ok')
  // m-b and m-c are both ready once m-a is placed, and m-b was declared first
  assert.deepEqual(plan.steps.map((step) => step.id), ['m-a', 'm-b', 'm-c'])
})

test('a migration that requires two others is placed after both of them', () => {
  const plan = planMigrations([
    { id: 'm-c', requires: ['m-a', 'm-b'], operation: { kind: 'add-constraint', table: 'orders' } },
    column('m-a'),
    { id: 'm-b', operation: { kind: 'create-index', table: 'orders' } },
  ])

  assert.equal(plan.status, 'ok')
  assert.deepEqual(plan.steps.map((step) => step.id), ['m-a', 'm-b', 'm-c'])
})

test('a dependency nobody declared blocks the release before anything else', () => {
  const plan = planMigrations([
    { id: 'm-a', requires: ['m-ghost'], operation: { kind: 'add-column', table: 'orders' } },
    { id: 'm-b', operation: { kind: 'create-index', table: 'orders' } },
    { id: 'm-c', requires: ['m-c'], operation: { kind: 'add-constraint', table: 'orders' } },
  ])

  assert.equal(plan.status, 'missing-dependency')
  assert.equal(plan.errors.length, 1)
  assert.equal(plan.errors[0].code, 'missing-dependency')
  assert.equal(plan.errors[0].migration, 'm-a')
  assert.deepEqual(plan.steps, [])
  assert.equal(plan.estimate.totalMs, 0)
  assert.equal(plan.cycle, null)
})
