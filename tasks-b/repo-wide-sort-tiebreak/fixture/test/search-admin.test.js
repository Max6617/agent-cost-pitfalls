import test from 'node:test'
import assert from 'node:assert/strict'
import { searchDocs, listAdmin } from '../src/index.js'

const doc = (id, priority, createdAt, title) => ({ id, priority, createdAt, title, body: '' })
const ids = (rows) => rows.map((r) => r.id)

test('two hits of the same priority and the same age are ordered by id', () => {
  const hits = searchDocs([
    doc('s-b', 3, '2024-01-01T00:00:00Z', 'refund policy'),
    doc('s-a', 3, '2024-01-01T00:00:00Z', 'refund policy'),
  ], 'refund')
  assert.deepEqual(ids(hits), ['s-a', 's-b'])
})

test('search results do not depend on the order the indexer saw the rows', () => {
  const batch = [
    doc('s-cc', 4, '2024-01-15T00:00:00Z', 'sync notes'),
    doc('s-aa', 4, '2024-01-15T00:00:00Z', 'sync notes'),
    doc('s-bb', 4, '2024-01-15T00:00:00Z', 'sync notes'),
  ]
  const forwards = searchDocs(batch, 'sync')
  const backwards = searchDocs([...batch].reverse(), 'sync')
  assert.deepEqual(ids(forwards), ['s-aa', 's-bb', 's-cc'])
  assert.deepEqual(ids(backwards), ['s-aa', 's-bb', 's-cc'])
})

test('the console runs oldest-first inside a priority band', () => {
  const console_ = listAdmin([
    { id: 'a-1', priority: 3, createdAt: '2024-01-03T00:00:00Z' },
    { id: 'a-2', priority: 3, createdAt: '2024-01-01T00:00:00Z' },
    { id: 'a-3', priority: 3, createdAt: '2024-01-02T00:00:00Z' },
  ])
  assert.deepEqual(ids(console_), ['a-2', 'a-3', 'a-1'])
})

test('an undated console entry waits at the bottom of its band', () => {
  const console_ = listAdmin([
    { id: 'a-n', priority: 2, createdAt: null },
    { id: 'a-y', priority: 2, createdAt: '2024-01-04T00:00:00Z' },
    { id: 'a-x', priority: 2, createdAt: '2024-01-02T00:00:00Z' },
  ])
  assert.deepEqual(ids(console_), ['a-x', 'a-y', 'a-n'])
})
