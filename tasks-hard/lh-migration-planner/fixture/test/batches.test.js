import test from 'node:test'
import assert from 'node:assert/strict'
import { planMigrations } from '../src/index.js'

const backfill = (id, rows, batchSize) => ({
  id,
  operation: { kind: 'backfill', table: 'orders', column: 'region' },
  rows,
  ...(batchSize === undefined ? {} : { batchSize }),
})

test('a backfill that divides evenly has no short batch', () => {
  const plan = planMigrations([backfill('m-1', 25000, 5000)])

  assert.equal(plan.status, 'ok')
  assert.equal(plan.steps[0].batches.length, 5)
  assert.deepEqual(plan.steps[0].batches.map((batch) => batch.rows), [5000, 5000, 5000, 5000, 5000])
  assert.equal(plan.steps[0].lockMs, 200)
})

test('a backfill that does not divide evenly ends with a short batch', () => {
  const plan = planMigrations([backfill('m-1', 20500, 5000)])

  assert.equal(plan.steps[0].batches.length, 5)
  assert.deepEqual(plan.steps[0].batches.map((batch) => batch.rows), [5000, 5000, 5000, 5000, 500])
})

test('a migration that declares no rows is not batched at all', () => {
  const plan = planMigrations([
    { id: 'm-1', operation: { kind: 'add-column', table: 'orders', column: 'region' } },
  ])

  assert.deepEqual(plan.steps[0].batches, [])
  assert.equal(plan.steps[0].lockMs, 0)
})

test('a step whose lock window is over the budget is flagged', () => {
  const plan = planMigrations([backfill('m-1', 255000, 5000)])

  assert.equal(plan.steps[0].batches.length, 51)
  assert.deepEqual(plan.warnings.map((warning) => warning.code), ['long-lock'])
  assert.equal(plan.warnings[0].migration, 'm-1')
})
