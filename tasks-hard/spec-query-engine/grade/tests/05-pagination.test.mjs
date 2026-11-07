// Sub-problem 5: the page and the counts - what `total` counts, what a limit of
// zero means, and how paging lines up with the order the query produced.
import test from 'node:test'
import assert from 'node:assert/strict'
import { runQuery } from '../src/index.js'

test('total counts the rows the query produced, not the page it returned', () => {
  const rows = [1, 2, 3, 4, 5].map((units) => ({ id: `r${units}`, units }))
  const result = runQuery(rows, {
    where: { field: 'units', op: 'gte', value: 2 },
    order: [{ field: 'units', dir: 'desc' }],
    offset: 0,
    limit: 2,
  })
  assert.deepEqual(result.rows.map((row) => row.id), ['r5', 'r4'])
  assert.equal(result.total, 4)
  assert.equal(result.count, 2)
  assert.equal(result.offset, 0)
  assert.equal(result.limit, 2)
})

test('limit 0 is a page with no rows, and limit null is every row that is left', () => {
  const rows = [1, 2, 3, 4].map((n) => ({ n }))

  const none = runQuery(rows, { limit: 0 })
  assert.deepEqual(none.rows, [])
  assert.equal(none.total, 4)
  assert.equal(none.count, 0)
  assert.equal(none.limit, 0)

  const all = runQuery(rows, { limit: null })
  assert.equal(all.rows.length, 4)
  assert.equal(all.total, 4)
  assert.equal(all.limit, null)

  const skipped = runQuery(rows, { offset: 2, limit: 0 })
  assert.deepEqual(skipped.rows, [])
  assert.equal(skipped.total, 4)
  assert.equal(skipped.offset, 2)
})

test('paging visits every row once, in the order the query produced', () => {
  const rows = [50, 10, 40, 20, 60, 30].map((score) => ({ id: `s${score}`, score }))
  const page = (offset) => runQuery(rows, { order: [{ field: 'score' }], offset, limit: 2 })

  const first = page(0)
  const second = page(2)
  const third = page(4)
  assert.deepEqual(first.rows.map((row) => row.id), ['s10', 's20'])
  assert.deepEqual(second.rows.map((row) => row.id), ['s30', 's40'])
  assert.deepEqual(third.rows.map((row) => row.id), ['s50', 's60'])
  for (const result of [first, second, third]) {
    assert.equal(result.total, 6)
    assert.equal(result.count, 2)
  }
})

test('an offset that lands on a group boundary starts at the next group', () => {
  const rows = [
    { region: 'north', amount: 10 },
    { region: 'north', amount: 20 },
    { region: 'south', amount: 5 },
    { region: 'east', amount: 7 },
    { region: 'east', amount: 3 },
  ]
  const result = runQuery(rows, {
    group: { by: ['region'], aggregates: { orders: { op: 'count' }, total: { op: 'sum', field: 'amount' } } },
    order: [{ field: 'orders' }, { field: 'region', dir: 'desc' }],
    offset: 1,
    limit: 2,
  })
  assert.deepEqual(result.rows, [
    { region: 'north', orders: 2, total: 30 },
    { region: 'east', orders: 2, total: 10 },
  ])
  assert.equal(result.total, 3)
  assert.equal(result.count, 2)
})

test('an aggregate covers its whole group and the limit only truncates the page', () => {
  const rows = [
    { region: 'a', amount: 1 },
    { region: 'a', amount: 2 },
    { region: 'b', amount: 3 },
    { region: 'b', amount: 4 },
    { region: 'c', amount: 5 },
    { region: 'c', amount: 6 },
  ]
  const result = runQuery(rows, {
    group: { by: ['region'], aggregates: { orders: { op: 'count' }, total: { op: 'sum', field: 'amount' } } },
    order: [{ field: 'total', dir: 'desc' }],
    limit: 1,
  })
  assert.deepEqual(result.rows, [{ region: 'c', orders: 2, total: 11 }])
  assert.equal(result.total, 3)
  assert.equal(result.count, 1)
})

test('an offset past the end is an empty page', () => {
  const rows = [{ n: 1 }, { n: 2 }, { n: 3 }]
  const result = runQuery(rows, { offset: 5, limit: 2 })
  assert.deepEqual(result.rows, [])
  assert.equal(result.count, 0)
  assert.equal(result.offset, 5)
})
