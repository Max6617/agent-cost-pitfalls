// Sub-problem 4: the search box - ties fall to the id key (docs §2), so a
// result never depends on the order the indexer saw the rows.
import test from 'node:test'
import assert from 'node:assert/strict'
import { searchDocs } from '../src/index.js'

const doc = (id, priority, createdAt, title, body = '') => ({ id, priority, createdAt, title, body })
const ids = (rows) => rows.map((r) => r.id)

test('two hits of the same priority and the same age are ordered by id', () => {
  const hits = searchDocs([
    doc('s-b', 3, '2024-01-01T00:00:00Z', 'alpha'),
    doc('s-a', 3, '2024-01-01T00:00:00Z', 'alpha'),
  ], 'alpha')
  assert.deepEqual(ids(hits), ['s-a', 's-b'])
})

test('hits with distinct keys come in the shared listing order', () => {
  const hits = searchDocs([
    doc('s-1', 2, '2024-01-02T00:00:00Z', 'report one'),
    doc('s-2', 8, '2024-01-03T00:00:00Z', 'report two'),
    doc('s-3', 2, '2024-01-01T00:00:00Z', 'report three'),
  ], 'report')
  assert.deepEqual(ids(hits), ['s-2', 's-3', 's-1'])
})

test('the same documents arrive in any order and come back identically', () => {
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

test('filtering comes first, then the full listing order on what survives', () => {
  const hits = searchDocs([
    doc('s-2', 1, '2024-01-01T00:00:00Z', 'sync beta'),
    doc('s-1', 1, '2024-01-01T00:00:00Z', 'sync alpha'),
    doc('s-3', null, '2024-01-01T00:00:00Z', 'sync gamma'),
    doc('s-4', 9, null, 'sync delta'),
    doc('s-5', 9, '2024-01-02T00:00:00Z', 'other'),
  ], 'sync')
  assert.deepEqual(ids(hits), ['s-4', 's-1', 's-2', 's-3'])
})
