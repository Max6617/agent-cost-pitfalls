// Sub-problem 2: a phrase is adjacency inside one field, not co-occurrence.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createIndex } from '../src/index.js'

test('a phrase needs its terms adjacent and in order', () => {
  const index = createIndex({
    documents: [
      { id: 'q-1', title: 'quick brown fox', tags: '', body: 'nothing here' },
      { id: 'q-2', title: 'quick red fox', tags: '', body: 'the brown one' },
      { id: 'q-3', title: 'brown notes', tags: '', body: 'a quick summary' },
    ],
  })
  const found = (query) => index.search(query, { limit: 10 }).hits.map((hit) => hit.id)
  assert.deepEqual(found('"quick brown"'), ['q-1'])
  assert.deepEqual(found('"brown quick"'), [])
  assert.deepEqual(found('"quick fox"'), [])
})

test('a phrase does not match across a field boundary, and the boosted field wins', () => {
  const index = createIndex({
    documents: [
      { id: 'r-1', title: 'gamma delta notes', tags: '', body: 'a report' },
      { id: 'r-2', title: 'gamma notes', tags: '', body: 'delta report' },
      { id: 'r-3', title: 'notes', tags: '', body: 'a gamma delta report' },
    ],
  })
  assert.deepEqual(index.search('"gamma delta"', { limit: 10 }).hits.map((hit) => hit.id), ['r-1', 'r-3'])
})

test('a phrase keeps its stopwords even though bare stopwords are dropped', () => {
  const index = createIndex({
    documents: [
      { id: 'v-1', title: 'wild', tags: '', body: 'in the wild' },
      { id: 'v-2', title: 'wild', tags: '', body: 'the wild in open' },
      { id: 'v-3', title: 'wild', tags: '', body: 'kept in the open' },
    ],
  })
  assert.deepEqual(index.search('"in the"', { limit: 10 }).hits.map((hit) => hit.id), ['v-1', 'v-3'])
  assert.equal(index.search('in the').total, 0)
})
