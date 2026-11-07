// Sub-problem 1: filters - present, null and missing values, and the
// comparisons this language refuses to make.
import test from 'node:test'
import assert from 'node:assert/strict'
import { runQuery } from '../src/index.js'

const ids = (rows, query) => runQuery(rows, query).rows.map((row) => row.id)

test('a filter on a field the row does not have matches nothing', () => {
  const rows = [{ id: 'a', qty: 2 }, { id: 'b' }, { id: 'c', qty: null }]

  const equal = runQuery(rows, { where: { field: 'qty', op: 'eq', value: 2 } })
  assert.deepEqual(equal.rows.map((row) => row.id), ['a'])
  assert.equal(equal.total, 1)

  assert.deepEqual(ids(rows, { where: { field: 'qty', op: 'isMissing' } }), ['b'])
  assert.deepEqual(ids(rows, { where: { field: 'qty', op: 'isNull' } }), ['c'])
  assert.deepEqual(ids(rows, { where: { field: 'qty', op: 'in', value: [2, null] } }), ['a', 'c'])
})

test('ne and notIn are the negations of eq and in, so a missing field satisfies them', () => {
  const rows = [{ id: 'a', qty: 2 }, { id: 'b' }, { id: 'c', qty: null }, { id: 'd', qty: '2' }]

  assert.deepEqual(ids(rows, { where: { field: 'qty', op: 'ne', value: 2 } }), ['b', 'c', 'd'])
  assert.deepEqual(ids(rows, { where: { field: 'qty', op: 'notIn', value: [2] } }), ['b', 'c', 'd'])
  assert.deepEqual(ids(rows, { where: { field: 'qty', op: 'ne', value: null } }), ['a', 'b', 'd'])
  assert.deepEqual(ids(rows, { where: { field: 'qty', op: 'notIn', value: [null] } }), ['a', 'b', 'd'])
})

test('values of different classes are never equal and never orderable', () => {
  const rows = [
    { id: 'number', v: 3 },
    { id: 'text', v: '3' },
    { id: 'yes', v: true },
    { id: 'word', v: 'true' },
    { id: 'nothing', v: null },
    { id: 'absent' },
  ]
  assert.deepEqual(ids(rows, { where: { field: 'v', op: 'eq', value: 3 } }), ['number'])
  assert.deepEqual(ids(rows, { where: { field: 'v', op: 'eq', value: '3' } }), ['text'])
  assert.deepEqual(ids(rows, { where: { field: 'v', op: 'eq', value: true } }), ['yes'])
  assert.deepEqual(ids(rows, { where: { field: 'v', op: 'eq', value: null } }), ['nothing'])
  assert.deepEqual(ids(rows, { where: { field: 'v', op: 'in', value: [3, null] } }), ['number', 'nothing'])

  const sizes = [
    { id: 'number', v: 5 },
    { id: 'text', v: '5' },
    { id: 'nothing', v: null },
    { id: 'absent' },
    { id: 'bool', v: false },
  ]
  assert.deepEqual(ids(sizes, { where: { field: 'v', op: 'lt', value: 10 } }), ['number'])
  assert.deepEqual(ids(sizes, { where: { field: 'v', op: 'gt', value: 1 } }), ['number'])
  assert.deepEqual(ids(sizes, { where: { field: 'v', op: 'lte', value: '9' } }), ['text'])
  assert.deepEqual(ids(sizes, { where: { not: { field: 'v', op: 'lt', value: 10 } } }), ['text', 'nothing', 'absent', 'bool'])
})

test('combinations: an empty and is true, an empty or is false, not negates', () => {
  const rows = [
    { id: 'a', qty: 2, region: 'north' },
    { id: 'b', qty: 5, region: 'south' },
    { id: 'c', qty: 9, region: 'north' },
  ]
  assert.deepEqual(ids(rows, { where: { and: [] } }), ['a', 'b', 'c'])
  assert.deepEqual(ids(rows, { where: { or: [] } }), [])
  assert.deepEqual(ids(rows, {
    where: {
      and: [
        { field: 'qty', op: 'gt', value: 1 },
        { not: { field: 'region', op: 'in', value: ['north'] } },
      ],
    },
  }), ['b'])
  assert.deepEqual(ids(rows, {
    where: {
      or: [
        { field: 'qty', op: 'lt', value: 3 },
        { field: 'qty', op: 'gt', value: 8 },
      ],
    },
  }), ['a', 'c'])
})
