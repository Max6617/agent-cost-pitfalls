import test from 'node:test'
import assert from 'node:assert/strict'
import { runQuery } from '../src/index.js'

test('count and sum summarise each group', () => {
  const rows = [
    { region: 'north', amount: 10 },
    { region: 'south', amount: 5 },
    { region: 'north', amount: 7 },
  ]
  const result = runQuery(rows, {
    group: { by: ['region'], aggregates: { orders: { op: 'count' }, total: { op: 'sum', field: 'amount' } } },
  })
  assert.deepEqual(result.rows, [
    { region: 'north', orders: 2, total: 17 },
    { region: 'south', orders: 1, total: 5 },
  ])
})

test('avg averages the values there are and ignores the nulls', () => {
  const rows = [
    { region: 'north', amount: 10 },
    { region: 'north', amount: null },
    { region: 'north', amount: 20 },
  ]
  const result = runQuery(rows, {
    group: { by: ['region'], aggregates: { mean: { op: 'avg', field: 'amount' } } },
  })
  assert.deepEqual(result.rows, [{ region: 'north', mean: 15 }])
})

test('having drops the groups whose aggregate does not pass', () => {
  const rows = [
    { region: 'north', amount: 10 },
    { region: 'north', amount: 7 },
    { region: 'south', amount: 5 },
  ]
  const result = runQuery(rows, {
    group: { by: ['region'], aggregates: { orders: { op: 'count' }, total: { op: 'sum', field: 'amount' } } },
    having: { field: 'orders', op: 'gt', value: 1 },
  })
  assert.deepEqual(result.rows, [{ region: 'north', orders: 2, total: 17 }])
})
