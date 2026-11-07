// Sub-problem 3: the account directory - nulls sort last in every key
// (docs §2), they do not float to the top.
import test from 'node:test'
import assert from 'node:assert/strict'
import { listUsers } from '../src/index.js'

const row = (id, priority, createdAt, extra = {}) => ({ id, priority, createdAt, ...extra })
const ids = (rows) => rows.map((r) => r.id)

test('an account with no priority ranks below every prioritised account', () => {
  const directory = listUsers([
    row('u-p2', 2, '2024-01-03T08:00:00Z', { name: 'P2' }),
    row('u-n', null, '2024-01-01T08:00:00Z', { name: 'New' }),
    row('u-p6', 6, '2024-01-02T08:00:00Z', { name: 'P6' }),
  ])
  assert.deepEqual(ids(directory), ['u-p6', 'u-p2', 'u-n'])
})

test('accounts with every key set sort by priority, then age, then id', () => {
  const directory = listUsers([
    row('u-c', 4, '2024-02-01T08:00:00Z', { name: 'C' }),
    row('u-a', 4, '2024-01-01T08:00:00Z', { name: 'A' }),
    row('u-b', 4, '2024-01-01T08:00:00Z', { name: 'B' }),
    row('u-d', 9, '2024-03-01T08:00:00Z', { name: 'D' }),
  ])
  assert.deepEqual(ids(directory), ['u-d', 'u-a', 'u-b', 'u-c'])
})

test('a legacy account with no createdAt comes after the dated accounts in its band', () => {
  const directory = listUsers([
    row('u-1', 5, '2024-01-10T08:00:00Z', { name: 'One' }),
    row('u-2', 5, null, { name: 'Two' }),
    row('u-3', 5, '2024-01-05T08:00:00Z', { name: 'Three' }),
  ])
  assert.deepEqual(ids(directory), ['u-3', 'u-1', 'u-2'])
})

test('an unprioritised group sorts by age and id, with the undated account last of all', () => {
  const directory = listUsers([
    row('u-m', null, '2024-01-01T08:00:00Z', { name: 'M' }),
    row('u-k', null, null, { name: 'K' }),
    row('u-l', 1, '2024-06-01T08:00:00Z', { name: 'L' }),
    row('u-j', 1, '2024-01-01T08:00:00Z', { name: 'J' }),
    row('u-i', 1, '2024-01-01T08:00:00Z', { name: 'I' }),
  ])
  assert.deepEqual(ids(directory), ['u-i', 'u-j', 'u-l', 'u-m', 'u-k'])
})
