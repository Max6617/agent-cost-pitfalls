// Sub-problem 2: the fulfilment queue - a listing returns a new array and
// leaves the caller's array in arrival order (docs §3).
import test from 'node:test'
import assert from 'node:assert/strict'
import { listOrders } from '../src/index.js'

const row = (id, priority, createdAt, extra = {}) => ({ id, priority, createdAt, ...extra })
const ids = (rows) => rows.map((r) => r.id)

test('the queue is in the shared listing order', () => {
  const queue = listOrders([
    row('o-2', 3, '2024-02-02T10:00:00Z'),
    row('o-1', 3, '2024-02-01T10:00:00Z'),
    row('o-9', null, '2024-02-01T10:00:00Z'),
    row('o-5', 7, '2024-02-05T10:00:00Z'),
  ])
  assert.deepEqual(ids(queue), ['o-5', 'o-1', 'o-2', 'o-9'])
})

test('listing the queue does not reshuffle the caller\'s array', () => {
  const batch = [
    row('o-b', 1, '2024-02-03T10:00:00Z'),
    row('o-a', 5, '2024-02-01T10:00:00Z'),
    row('o-c', 3, '2024-02-02T10:00:00Z'),
  ]
  listOrders(batch)
  assert.deepEqual(ids(batch), ['o-b', 'o-a', 'o-c'])
})

test('the queue is a fresh array, not the one that was passed in', () => {
  const batch = [
    row('o-2', 2, '2024-02-02T10:00:00Z'),
    row('o-1', 9, '2024-02-01T10:00:00Z'),
  ]
  const queue = listOrders(batch)
  assert.notEqual(queue, batch)
  assert.deepEqual(ids(queue), ['o-1', 'o-2'])
})

test('nulls and full ties sort by the rules, and the input still keeps arrival order', () => {
  const batch = [
    row('o-x', 2, '2024-02-02T10:00:00Z'),
    row('o-w', 2, '2024-02-02T10:00:00Z'),
    row('o-z', null, '2024-02-01T10:00:00Z'),
  ]
  const queue = listOrders(batch)
  assert.deepEqual(ids(queue), ['o-w', 'o-x', 'o-z'])
  assert.deepEqual(ids(batch), ['o-x', 'o-w', 'o-z'])
})
