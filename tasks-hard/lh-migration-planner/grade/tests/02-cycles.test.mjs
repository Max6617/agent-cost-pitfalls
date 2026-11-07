// Sub-problem 2: dependency cycles are reported, wherever in the release they are,
// and they win over everything the release cannot run anyway.
import test from 'node:test'
import assert from 'node:assert/strict'
import { planMigrations } from '../src/index.js'

const column = (id, requires = []) => ({
  id, requires, operation: { kind: 'add-column', table: 'orders' },
})

test('a cycle among migrations nothing else depends on is still a cycle', () => {
  const plan = planMigrations([
    column('m-x'),
    column('m-y'),
    { id: 'm-a', requires: ['m-b'], operation: { kind: 'add-constraint', table: 'orders' } },
    { id: 'm-b', requires: ['m-a'], operation: { kind: 'create-index', table: 'orders' } },
  ])

  assert.equal(plan.status, 'cycle')
  assert.deepEqual(plan.cycle, ['m-a', 'm-b'])
  assert.deepEqual(plan.steps, [])
})

test('the reported cycle names every migration in it, in dependency order', () => {
  const plan = planMigrations([
    { id: 'm-a', requires: ['m-b'], operation: { kind: 'add-column', table: 'orders' } },
    { id: 'm-b', requires: ['m-c'], operation: { kind: 'add-constraint', table: 'orders' } },
    { id: 'm-c', requires: ['m-b'], operation: { kind: 'create-index', table: 'orders' } },
  ])

  assert.equal(plan.status, 'cycle')
  // m-a leads into the loop; the loop itself is m-b <-> m-c
  assert.deepEqual(plan.cycle, ['m-b', 'm-c'])
})

test('migrations that merely rejoin are not a cycle', () => {
  const plan = planMigrations([
    column('m-a'),
    { id: 'm-b', requires: ['m-a'], operation: { kind: 'create-index', table: 'orders' } },
    { id: 'm-c', requires: ['m-a'], operation: { kind: 'backfill', table: 'orders' }, rows: 5000, batchSize: 5000 },
    { id: 'm-d', requires: ['m-b', 'm-c'], operation: { kind: 'add-constraint', table: 'orders' } },
  ])

  assert.equal(plan.status, 'ok')
  assert.equal(plan.cycle, null)
  assert.equal(plan.steps.length, 4)
})

test('the reported cycle starts at the member that was declared first', () => {
  const plan = planMigrations([
    { id: 'm-p', requires: ['m-c1'], operation: { kind: 'add-column', table: 'orders' } },
    { id: 'm-c2', requires: ['m-c1'], operation: { kind: 'create-index', table: 'orders' } },
    { id: 'm-c1', requires: ['m-c2'], operation: { kind: 'add-constraint', table: 'orders' } },
    { id: 'm-d1', requires: ['m-d2'], operation: { kind: 'add-column', table: 'customers' } },
    { id: 'm-d2', requires: ['m-d1'], operation: { kind: 'create-index', table: 'customers' } },
  ])

  assert.equal(plan.status, 'cycle')
  assert.deepEqual(plan.cycle, ['m-c2', 'm-c1'])
})

test('a cycle is reported ahead of a destructive step nobody acknowledged', () => {
  const plan = planMigrations([
    column('m-x'),
    { id: 'm-a', operation: { kind: 'drop-table', table: 'audit_old' } },
    { id: 'm-b', requires: ['m-c'], operation: { kind: 'add-constraint', table: 'orders' } },
    { id: 'm-c', requires: ['m-b'], operation: { kind: 'create-index', table: 'orders' } },
  ])

  // the release cannot run in any order, so that is what it is told, not that a
  // drop-table further down the list wanted an acknowledgement
  assert.equal(plan.status, 'cycle')
  assert.deepEqual(plan.cycle, ['m-b', 'm-c'])
  assert.deepEqual(plan.steps, [])
})
