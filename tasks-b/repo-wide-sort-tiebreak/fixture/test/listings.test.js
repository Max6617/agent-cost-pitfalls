import test from 'node:test'
import assert from 'node:assert/strict'
import { listTasks, listOrders, listUsers } from '../src/index.js'

const row = (id, priority, createdAt, extra = {}) => ({ id, priority, createdAt, ...extra })
const ids = (rows) => rows.map((r) => r.id)

test('the board puts the highest priority card first', () => {
  const board = listTasks([
    row('t-1', 1, '2024-03-01T09:00:00Z'),
    row('t-4', 4, '2024-03-03T09:00:00Z'),
    row('t-2', 2, '2024-03-02T09:00:00Z'),
  ])
  assert.deepEqual(ids(board), ['t-4', 't-2', 't-1'])
})

test('a card with no priority sinks to the bottom of the board', () => {
  const board = listTasks([
    row('t-none', null, '2024-03-02T09:00:00Z'),
    row('t-hi', 4, '2024-03-03T09:00:00Z'),
    row('t-lo', 1, '2024-03-01T09:00:00Z'),
  ])
  assert.deepEqual(ids(board), ['t-hi', 't-lo', 't-none'])
})

test('listing the queue leaves the caller\'s array as it was', () => {
  const batch = [
    row('o-b', 1, '2024-02-03T10:00:00Z'),
    row('o-a', 5, '2024-02-01T10:00:00Z'),
    row('o-c', 3, '2024-02-02T10:00:00Z'),
  ]
  listOrders(batch)
  assert.deepEqual(ids(batch), ['o-b', 'o-a', 'o-c'])
})

test('the queue comes back as a new array', () => {
  const batch = [
    row('o-2', 2, '2024-02-02T10:00:00Z'),
    row('o-1', 9, '2024-02-01T10:00:00Z'),
  ]
  const queue = listOrders(batch)
  assert.notEqual(queue, batch)
  assert.deepEqual(ids(queue), ['o-1', 'o-2'])
})

test('an account with no priority is listed below every prioritised account', () => {
  const directory = listUsers([
    row('u-none', null, '2024-01-02T08:00:00Z', { name: 'New' }),
    row('u-lo', 2, '2024-01-03T08:00:00Z', { name: 'Lo' }),
    row('u-hi', 6, '2024-01-01T08:00:00Z', { name: 'Hi' }),
  ])
  assert.deepEqual(ids(directory), ['u-hi', 'u-lo', 'u-none'])
})

test('a legacy account with no createdAt waits at the bottom of its band', () => {
  const directory = listUsers([
    row('u-legacy', 5, null, { name: 'Legacy' }),
    row('u-mid', 5, '2024-01-10T08:00:00Z', { name: 'Mid' }),
    row('u-old', 5, '2024-01-05T08:00:00Z', { name: 'Old' }),
  ])
  assert.deepEqual(ids(directory), ['u-old', 'u-mid', 'u-legacy'])
})
