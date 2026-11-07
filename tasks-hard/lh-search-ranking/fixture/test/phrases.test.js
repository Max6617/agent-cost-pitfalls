import test from 'node:test'
import assert from 'node:assert/strict'
import { createIndex } from '../src/index.js'

const corpus = () => [
  { id: 'p-1', title: 'quick brown fox', tags: '', body: 'nothing here' },
  { id: 'p-2', title: 'quick red fox', tags: '', body: 'the brown one' },
  { id: 'p-3', title: 'gamma notes', tags: '', body: 'delta report' },
]

test('a phrase needs its words next to each other', () => {
  const index = createIndex({ documents: corpus() })
  assert.deepEqual(
    index.search('"quick brown"', { limit: 10 }).hits.map((hit) => hit.id),
    ['p-1'],
  )
})

test('a phrase does not match across two fields', () => {
  const index = createIndex({ documents: corpus() })
  assert.deepEqual(index.search('"gamma delta"', { limit: 10 }).hits, [])
})

test('a phrase keeps its words in order', () => {
  const index = createIndex({ documents: corpus() })
  assert.deepEqual(index.search('"brown quick"', { limit: 10 }).hits, [])
})
