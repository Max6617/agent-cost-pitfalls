// Sub-problem 4: batched backfills and the lock window a batch list implies.
import test from 'node:test'
import assert from 'node:assert/strict'
import { planMigrations } from '../src/index.js'

const backfill = (id, rows, batchSize) => ({
  id,
  operation: { kind: 'backfill', table: 'orders', column: 'region' },
  rows,
  ...(batchSize === undefined ? {} : { batchSize }),
})

test('a backfill expands into whole batches plus a short last one', () => {
  const plan = planMigrations([backfill('m-1', 20500, 5000)])

  assert.equal(plan.status, 'ok')
  assert.equal(plan.steps[0].batches.length, 5)
  assert.deepEqual(
    plan.steps[0].batches,
    [
      { index: 0, rows: 5000 },
      { index: 1, rows: 5000 },
      { index: 2, rows: 5000 },
      { index: 3, rows: 5000 },
      { index: 4, rows: 500 },
    ],
  )
  assert.equal(plan.steps[0].lockMs, 200)
})

test('the lock budget flags what is over it, not what is exactly on it', () => {
  const plan = planMigrations([
    backfill('m-on-budget', 250000, 5000),
    backfill('m-over-budget', 255000, 5000),
  ])

  assert.equal(plan.steps[0].batches.length, 50)
  assert.equal(plan.steps[0].lockMs, 2000)
  assert.equal(plan.steps[1].batches.length, 51)
  assert.equal(plan.steps[1].lockMs, 2040)
  assert.deepEqual(plan.warnings.map((warning) => warning.migration), ['m-over-budget'])
  // the step that is exactly on the budget is not late, and its estimate is
  // still the documented sum: overhead, batch overhead, row work
  assert.equal(plan.steps[0].estimateMs, 13750)
})

test('a backfill with no batch size of its own uses the configured one', () => {
  const plan = planMigrations([backfill('m-1', 21000)])

  assert.equal(plan.steps[0].batches.length, 5)
  assert.deepEqual(plan.steps[0].batches.map((batch) => batch.rows), [5000, 5000, 5000, 5000, 1000])
})
