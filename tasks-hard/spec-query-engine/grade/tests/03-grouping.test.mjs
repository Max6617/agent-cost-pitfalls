// Sub-problem 3: grouping and the aggregates - what a group is, what a grouped
// row carries, and what an aggregate returns when there is nothing to add up.
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
  assert.equal(result.total, 2)
})

test('a group whose values are all null has no operands at all', () => {
  const rows = [
    { region: 'north', amount: null },
    { region: 'north', amount: null },
    { region: 'south' },
  ]
  const result = runQuery(rows, {
    group: {
      by: ['region'],
      aggregates: {
        rows: { op: 'count' },
        valued: { op: 'count', field: 'amount' },
        total: { op: 'sum', field: 'amount' },
        low: { op: 'min', field: 'amount' },
        high: { op: 'max', field: 'amount' },
        mean: { op: 'avg', field: 'amount' },
      },
    },
  })
  assert.deepEqual(result.rows, [
    { region: 'north', rows: 2, valued: 0, total: 0, low: null, high: null, mean: null },
    { region: 'south', rows: 1, valued: 0, total: 0, low: null, high: null, mean: null },
  ])
})

test('where narrows the rows the aggregates see and having filters the groups they produced', () => {
  const rows = [
    { region: 'north', units: 3, amount: 30 },
    { region: 'north', units: 1, amount: 10 },
    { region: 'south', units: 4, amount: 40 },
    { region: 'south', units: 2, amount: 20 },
    { region: 'east', units: 1, amount: 10 },
  ]
  const result = runQuery(rows, {
    where: { field: 'units', op: 'gte', value: 2 },
    group: { by: ['region'], aggregates: { orders: { op: 'count' }, units: { op: 'sum', field: 'units' } } },
    having: { field: 'orders', op: 'gt', value: 1 },
    order: [{ field: 'units', dir: 'desc' }],
  })
  assert.deepEqual(result.rows, [{ region: 'south', orders: 2, units: 6 }])
  assert.equal(result.total, 1)
})

test('a missing group key is its own group and the grouped row does not carry it', () => {
  const rows = [
    { channel: 'web', amount: 1 },
    { amount: 2 },
    { channel: 'store', amount: 4 },
    { amount: 8 },
  ]
  const result = runQuery(rows, {
    group: { by: ['channel'], aggregates: { orders: { op: 'count' }, total: { op: 'sum', field: 'amount' } } },
  })
  assert.deepEqual(result.rows, [
    { channel: 'web', orders: 1, total: 1 },
    { orders: 2, total: 10 },
    { channel: 'store', orders: 1, total: 4 },
  ])
  assert.equal(result.total, 3)

  const empty = runQuery([], { group: { by: [], aggregates: { orders: { op: 'count' } } } })
  assert.deepEqual(empty.rows, [])
  assert.equal(empty.total, 0)
})
