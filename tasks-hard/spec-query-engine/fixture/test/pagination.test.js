import test from 'node:test'
import assert from 'node:assert/strict'
import { runQuery } from '../src/index.js'

const rows = [5, 3, 1, 4, 2].map((units) => ({ id: `r${units}`, units }))

test('limit and offset take a window of the ordered rows', () => {
  const result = runQuery(rows, {
    order: [{ field: 'units' }],
    offset: 1,
    limit: 2,
  })
  assert.deepEqual(result.rows.map((row) => row.id), ['r2', 'r3'])
  assert.equal(result.count, 2)
})

test('total counts the rows that matched, not the rows on the page', () => {
  const result = runQuery(rows, {
    where: { field: 'units', op: 'gte', value: 2 },
    order: [{ field: 'units' }],
    limit: 2,
  })
  assert.deepEqual(result.rows.map((row) => row.id), ['r2', 'r3'])
  assert.equal(result.total, 4)
})

test('a limit of zero shows nothing and still counts the rows', () => {
  const result = runQuery(rows, { limit: 0 })
  assert.deepEqual(result.rows, [])
  assert.equal(result.count, 0)
})

test('an offset past the end is an empty page', () => {
  const result = runQuery(rows, { offset: 50, limit: 10 })
  assert.deepEqual(result.rows, [])
  assert.equal(result.count, 0)
})
