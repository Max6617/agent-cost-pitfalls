// Sub-problem 6: the grammar - what the language refuses, with which code and
// which path, and what it accepts without complaint.
import test from 'node:test'
import assert from 'node:assert/strict'
import { runQuery, QueryError } from '../src/index.js'

/** Run `query` against no rows at all and check the refusal it must raise. */
function refusal(query, code, path) {
  let thrown = null
  try {
    runQuery([], query)
  } catch (error) {
    thrown = error
  }
  assert.ok(thrown !== null, `expected ${code} at ${path}, nothing was raised`)
  assert.equal(thrown.name, 'QueryError')
  assert.equal(thrown.code, code)
  assert.equal(thrown.path, path)
}

test('an operator the language does not have is refused, and the error names it', () => {
  refusal(
    { where: { and: [{ field: 'units', op: 'gte', value: 1 }, { field: 'region', op: 'contains', value: 'north' }] } },
    'unknown-operator',
    'query.where.and.1.op',
  )
  refusal(
    { where: { not: { field: 'amount', op: 'equals', value: 1 } } },
    'unknown-operator',
    'query.where.not.op',
  )
  refusal(
    {
      group: { by: ['region'], aggregates: { orders: { op: 'count' } } },
      having: { field: 'orders', op: 'moreThan', value: 1 },
    },
    'unknown-operator',
    'query.having.op',
  )
})

test('the rest of the grammar is refused with the documented paths', () => {
  refusal({ filter: { field: 'a', op: 'eq', value: 1 } }, 'unknown-key', 'query.filter')
  refusal({ order: [{ field: 'a', dir: 'descending' }] }, 'bad-direction', 'query.order.0.dir')
  refusal({ limit: -1 }, 'bad-integer', 'query.limit')
  refusal({ limit: 1.5 }, 'bad-integer', 'query.limit')
  refusal({ offset: '2' }, 'bad-integer', 'query.offset')
  refusal(
    { group: { by: ['a'], aggregates: { middle: { op: 'median', field: 'a' } } } },
    'unknown-aggregate',
    'query.group.aggregates.middle.op',
  )
  refusal(
    { group: { by: ['a'], aggregates: { total: { op: 'sum' } } } },
    'bad-shape',
    'query.group.aggregates.total',
  )
  refusal({ where: { field: 'a', op: 'isNull', value: 1 } }, 'bad-shape', 'query.where')
})

test('a query the language accepts runs, and QueryError is the class it raises', () => {
  const rows = [{ q: 1 }, { q: 2 }, { r: 'x' }]
  const result = runQuery(rows, {
    where: { field: 'q', op: 'gte', value: 1 },
    group: { by: ['r'], aggregates: { orders: { op: 'count' }, total: { op: 'sum', field: 'q' } } },
    having: { field: 'orders', op: 'gte', value: 1 },
    select: ['r', 'total'],
    order: [{ field: 'total', dir: 'desc' }],
    offset: 0,
    limit: null,
  })
  assert.ok(Array.isArray(result.rows))
  assert.equal(result.count, result.rows.length)

  assert.equal(typeof QueryError, 'function')
  const raised = new QueryError('bad-shape', 'query', 'x')
  assert.ok(raised instanceof Error)
  assert.equal(raised.name, 'QueryError')
  assert.equal(raised.code, 'bad-shape')
  assert.equal(raised.path, 'query')
})
