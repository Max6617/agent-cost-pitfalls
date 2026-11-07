// Sub-problem 5: the operations console - inside one priority band the oldest
// row leads (docs §2), not the newest.
import test from 'node:test'
import assert from 'node:assert/strict'
import { listAdmin } from '../src/index.js'

const row = (id, priority, createdAt, extra = {}) => ({ id, priority, createdAt, ...extra })
const ids = (rows) => rows.map((r) => r.id)

test('inside one priority band the oldest entry leads', () => {
  const console_ = listAdmin([
    row('a-1', 3, '2024-01-03T00:00:00Z'),
    row('a-2', 3, '2024-01-01T00:00:00Z'),
    row('a-3', 3, '2024-01-02T00:00:00Z'),
  ])
  assert.deepEqual(ids(console_), ['a-2', 'a-3', 'a-1'])
})

test('entries created in the same instant fall back to priority, then id', () => {
  const console_ = listAdmin([
    row('a-x', 1, '2024-02-02T00:00:00Z'),
    row('a-y', 5, '2024-02-02T00:00:00Z'),
    row('a-z', 5, '2024-02-02T00:00:00Z'),
  ])
  assert.deepEqual(ids(console_), ['a-y', 'a-z', 'a-x'])
})

test('an undated entry sits at the bottom of its band while the dated ones run oldest-first', () => {
  const console_ = listAdmin([
    row('a-1', 2, '2024-01-03T00:00:00Z'),
    row('a-2', 2, null),
    row('a-3', 2, '2024-01-01T00:00:00Z'),
    row('a-4', 7, '2024-01-02T00:00:00Z'),
  ])
  assert.deepEqual(ids(console_), ['a-4', 'a-3', 'a-1', 'a-2'])
})
