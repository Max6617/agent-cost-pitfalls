// Sub-problem 1: the team board - most urgent card on top (docs §2: a bigger
// priority number is more urgent, not a P1-first ticket number).
import test from 'node:test'
import assert from 'node:assert/strict'
import { listTasks } from '../src/index.js'

const row = (id, priority, createdAt, extra = {}) => ({ id, priority, createdAt, ...extra })
const ids = (rows) => rows.map((r) => r.id)

test('the board stacks the highest priority number on top', () => {
  const board = listTasks([
    row('t-2', 2, '2024-03-01T09:00:00Z'),
    row('t-5', 5, '2024-03-03T09:00:00Z'),
    row('t-4', 4, '2024-03-02T09:00:00Z'),
  ])
  assert.deepEqual(ids(board), ['t-5', 't-4', 't-2'])
})

test('a card with no priority sits below every prioritised card', () => {
  const board = listTasks([
    row('t-hi', 4, '2024-03-03T09:00:00Z'),
    row('t-none', null, '2024-03-02T09:00:00Z'),
    row('t-lo', 1, '2024-03-01T09:00:00Z'),
  ])
  assert.deepEqual(ids(board), ['t-hi', 't-lo', 't-none'])
})

test('priority, then the older card, then id - with an untriaged card last', () => {
  const board = listTasks([
    row('t-b', 5, '2024-01-10T08:00:00Z'),
    row('t-a', 5, '2024-01-10T08:00:00Z'),
    row('t-c', 5, '2024-01-05T08:00:00Z'),
    row('t-d', 3, '2024-01-01T08:00:00Z'),
    row('t-e', null, '2024-01-02T08:00:00Z'),
  ])
  assert.deepEqual(ids(board), ['t-c', 't-a', 't-b', 't-d', 't-e'])
})

test('two cards at one priority are ordered by age, and both outrank a lower priority', () => {
  const board = listTasks([
    row('t-new', 4, '2024-01-09T08:00:00Z'),
    row('t-mid', 2, '2024-01-05T08:00:00Z'),
    row('t-old', 4, '2024-01-01T08:00:00Z'),
  ])
  assert.deepEqual(ids(board), ['t-old', 't-new', 't-mid'])
})
