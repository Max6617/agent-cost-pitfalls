import test from 'node:test'
import assert from 'node:assert/strict'
import { runQuery } from '../src/index.js'

const ids = (rows, query) => runQuery(rows, query).rows.map((row) => row.id)

test('one key orders the rows by its value', () => {
  const rows = [
    { id: 'a', units: 3 },
    { id: 'b', units: 1 },
    { id: 'c', units: 2 },
  ]
  assert.deepEqual(ids(rows, { order: [{ field: 'units' }] }), ['b', 'c', 'a'])
  assert.deepEqual(ids(rows, { order: [{ field: 'units', dir: 'desc' }] }), ['a', 'c', 'b'])
})

test('the first order key decides and the second breaks its ties', () => {
  const rows = [
    { id: 'a', region: 'north', amount: 10 },
    { id: 'b', region: 'south', amount: 30 },
    { id: 'c', region: 'north', amount: 20 },
  ]
  assert.deepEqual(ids(rows, { order: [{ field: 'region' }, { field: 'amount', dir: 'desc' }] }), ['c', 'a', 'b'])
})

test('a row whose sort key is missing goes after the rows that have one', () => {
  const rows = [
    { id: 'a' },
    { id: 'b', score: 2 },
    { id: 'c', score: 9 },
  ]
  assert.deepEqual(ids(rows, { order: [{ field: 'score' }] }), ['b', 'c', 'a'])
  assert.deepEqual(ids(rows, { order: [{ field: 'score', dir: 'desc' }] }), ['c', 'b', 'a'])
})
