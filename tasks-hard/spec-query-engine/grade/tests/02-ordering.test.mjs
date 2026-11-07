// Sub-problem 2: ordering - several keys, where null and missing go, how
// strings are compared, and what settles a tie.
import test from 'node:test'
import assert from 'node:assert/strict'
import { runQuery } from '../src/index.js'

const ids = (rows, query) => runQuery(rows, query).rows.map((row) => row.id)

test('the first order key decides and the later ones break its ties', () => {
  const rows = [
    { id: 'a', region: 'north', amount: 10 },
    { id: 'b', region: 'south', amount: 30 },
    { id: 'c', region: 'north', amount: 20 },
  ]
  assert.deepEqual(ids(rows, { order: [{ field: 'region' }, { field: 'amount', dir: 'desc' }] }), ['c', 'a', 'b'])

  const three = [
    { id: 'w', a: 1, b: 1, c: 2 },
    { id: 'x', a: 1, b: 2, c: 1 },
    { id: 'y', a: 1, b: 2, c: 2 },
    { id: 'z', a: 0, b: 9, c: 9 },
  ]
  assert.deepEqual(ids(three, { order: [{ field: 'a' }, { field: 'b' }, { field: 'c' }] }), ['z', 'w', 'x', 'y'])
})

test('null and missing sort last whichever way the key runs, and the page keeps the rows that have one', () => {
  const rows = [
    { id: 'a', score: 7 },
    { id: 'b' },
    { id: 'c', score: 9 },
    { id: 'd', score: null },
  ]
  assert.deepEqual(ids(rows, { order: [{ field: 'score' }] }), ['a', 'c', 'b', 'd'])
  assert.deepEqual(ids(rows, { order: [{ field: 'score', dir: 'desc' }] }), ['c', 'a', 'b', 'd'])

  const first = runQuery(rows, { order: [{ field: 'score' }], limit: 2 })
  assert.deepEqual(first.rows.map((row) => row.id), ['a', 'c'])
  assert.equal(first.total, 4)

  const top = runQuery(rows, { order: [{ field: 'score', dir: 'desc' }], limit: 2 })
  assert.deepEqual(top.rows.map((row) => row.id), ['c', 'a'])
  assert.equal(top.total, 4)
})

test('strings are compared by code unit and not by the host locale', () => {
  const rows = [
    { id: 'z', code: 'Z' },
    { id: 'a', code: 'a' },
    { id: 'b', code: 'B' },
    { id: 'aa', code: 'AA' },
  ]
  assert.deepEqual(ids(rows, { order: [{ field: 'code' }] }), ['aa', 'b', 'z', 'a'])
  assert.deepEqual(ids(rows, { order: [{ field: 'code', dir: 'desc' }] }), ['a', 'z', 'b', 'aa'])
})

test('rows that every key calls equal keep the order they arrived in', () => {
  const rows = [
    { id: 'second', tier: 'gold', tags: 3 },
    { id: 'first', tier: 'gold', tags: 1 },
    { id: 'third', tier: 'silver', tags: 2 },
  ]
  assert.deepEqual(ids(rows, { order: [{ field: 'tier' }] }), ['second', 'first', 'third'])
  assert.deepEqual(ids(rows, { order: [{ field: 'nothing' }] }), ['second', 'first', 'third'])
  assert.deepEqual(ids(rows, { order: [] }), ['second', 'first', 'third'])
})
