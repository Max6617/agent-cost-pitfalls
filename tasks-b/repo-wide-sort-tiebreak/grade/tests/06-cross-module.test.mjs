// Sub-problem 6: the screens agree with each other. One batch, read five
// ways, tells the same story (docs §2), listings compose without the batch
// changing under the caller (docs §3), and arrival order never leaks through.
import test from 'node:test'
import assert from 'node:assert/strict'
import { listTasks, listOrders, listUsers, searchDocs, listAdmin } from '../src/index.js'

const row = (id, priority, createdAt, extra = {}) => ({ id, priority, createdAt, ...extra })
const ids = (rows) => rows.map((r) => r.id)

test('every screen tells the same story about the same rows', () => {
  const batch = [
    row('m-2', 5, '2024-01-10T00:00:00Z'),
    row('m-5', 2, null),
    row('m-1', 5, '2024-01-10T00:00:00Z'),
    row('m-6', null, '2024-01-03T00:00:00Z'),
    row('m-3', 5, '2024-01-05T00:00:00Z'),
    row('m-4', 2, '2024-01-01T00:00:00Z'),
  ]
  const expected = ['m-3', 'm-1', 'm-2', 'm-4', 'm-5', 'm-6']
  assert.deepEqual(ids(listTasks(batch)), expected)
  assert.deepEqual(ids(listOrders(batch)), expected)
  assert.deepEqual(ids(listUsers(batch)), expected)
  assert.deepEqual(ids(searchDocs(batch, '')), expected)
  assert.deepEqual(ids(listAdmin(batch)), expected)
  // and the batch itself is still in arrival order after all five reads
  assert.deepEqual(ids(batch), ['m-2', 'm-5', 'm-1', 'm-6', 'm-3', 'm-4'])
})

test('a batch handed from the queue to the board keeps its shape', () => {
  const batch = [
    row('c-3', 1, '2024-01-03T00:00:00Z'),
    row('c-1', 9, '2024-01-01T00:00:00Z'),
    row('c-2', 5, '2024-01-02T00:00:00Z'),
  ]
  const queue = listOrders(batch)
  const board = listTasks(queue)
  assert.deepEqual(ids(board), ['c-1', 'c-2', 'c-3'])
  assert.notEqual(queue, batch)
  assert.deepEqual(ids(batch), ['c-3', 'c-1', 'c-2'])
})

test('no screen lets the arrival order of a batch leak into its listing', () => {
  const batch = [
    row('f-1', 3, '2024-01-01T00:00:00Z', { title: 't' }),
    row('f-2', 3, '2024-01-01T00:00:00Z', { title: 't' }),
    row('f-3', 1, '2024-01-03T00:00:00Z', { title: 't' }),
    row('f-4', null, '2024-01-01T00:00:00Z', { title: 't' }),
  ]
  const expected = ['f-1', 'f-2', 'f-3', 'f-4']
  const screens = [
    listTasks,
    listOrders,
    listUsers,
    (rows) => searchDocs(rows, 't'),
    listAdmin,
  ]
  for (const screen of screens) {
    assert.deepEqual(ids(screen(batch)), expected)
    assert.deepEqual(ids(screen([...batch].reverse())), expected)
  }
})
