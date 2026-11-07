// Sub-problem 4: projection - what a row of the report looks like, and which
// names the later stages can see.
import test from 'node:test'
import assert from 'node:assert/strict'
import { runQuery } from '../src/index.js'

test('a computed field follows the expression grammar', () => {
  const result = runQuery([{ qty: 2, price: 5, note: 'x' }], {
    select: [
      { expr: 'qty + price * 2', as: 'mixed' },
      { expr: '(qty + price) * 2', as: 'grouped' },
      { expr: 'price / qty', as: 'unit' },
      { expr: '-qty + 10', as: 'rest' },
      { field: 'note', as: 'label' },
    ],
  })
  assert.deepEqual(result.rows, [{ mixed: 12, grouped: 14, unit: 2.5, rest: 8, label: 'x' }])
})

test('a source field that is missing contributes no key at all', () => {
  const rows = [{ id: 'a', amount: 3 }, { id: 'b' }]
  const result = runQuery(rows, {
    select: ['id', { field: 'amount' }, { field: 'amount', as: 'total' }, { expr: 'amount + 1', as: 'next' }],
  })
  assert.deepEqual(result.rows, [
    { id: 'a', amount: 3, total: 3, next: 4 },
    { id: 'b', next: 1 },
  ])
  assert.deepEqual(Object.keys(result.rows[1]), ['id', 'next'])
  assert.equal(result.total, 2)
})

test('an order key names the field the projection produced', () => {
  const rows = [
    { id: 'a', amount: 10, qty: 1 },
    { id: 'b', amount: 30, qty: 2 },
    { id: 'c', amount: 20, qty: 3 },
  ]

  const renamed = runQuery(rows, {
    select: [{ field: 'id' }, { field: 'amount', as: 'total' }],
    order: [{ field: 'total', dir: 'desc' }],
  })
  assert.deepEqual(renamed.rows, [
    { id: 'b', total: 30 },
    { id: 'c', total: 20 },
    { id: 'a', total: 10 },
  ])

  // the source field the projection dropped is not there to sort by, so every
  // row is missing it and the arrival order stands
  const dropped = runQuery(rows, {
    select: ['id'],
    order: [{ field: 'amount', dir: 'desc' }],
  })
  assert.deepEqual(dropped.rows, [{ id: 'a' }, { id: 'b' }, { id: 'c' }])
})
