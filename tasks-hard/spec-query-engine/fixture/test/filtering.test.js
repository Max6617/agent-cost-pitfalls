import test from 'node:test'
import assert from 'node:assert/strict'
import { runQuery } from '../src/index.js'

const ids = (rows, query) => runQuery(rows, query).rows.map((row) => row.id)

test('eq keeps the rows whose field holds the value', () => {
  const rows = [
    { id: 'a', region: 'north' },
    { id: 'b', region: 'south' },
    { id: 'c', region: 'north' },
  ]
  assert.deepEqual(ids(rows, { where: { field: 'region', op: 'eq', value: 'north' } }), ['a', 'c'])
})

test('in keeps the rows whose field holds one of the listed values', () => {
  const rows = [
    { id: 'a', tier: 'gold' },
    { id: 'b', tier: 'silver' },
    { id: 'c', tier: 'bronze' },
  ]
  assert.deepEqual(ids(rows, { where: { field: 'tier', op: 'in', value: ['gold', 'bronze'] } }), ['a', 'c'])
  assert.deepEqual(ids(rows, { where: { field: 'tier', op: 'notIn', value: ['gold'] } }), ['b', 'c'])
})

test('a filter on a field the row does not have keeps nothing', () => {
  const rows = [
    { id: 'a', units: 3 },
    { id: 'b' },
    { id: 'c', units: null },
  ]
  assert.deepEqual(ids(rows, { where: { field: 'units', op: 'eq', value: 3 } }), ['a'])
  assert.deepEqual(ids(rows, { where: { field: 'units', op: 'isMissing' } }), ['b'])
})
