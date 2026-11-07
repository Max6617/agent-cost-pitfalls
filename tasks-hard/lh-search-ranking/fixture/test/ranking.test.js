import test from 'node:test'
import assert from 'node:assert/strict'
import { createIndex } from '../src/index.js'

test('a hit in the title outranks the same hit in the body', () => {
  const index = createIndex({
    documents: [
      { id: 'r-1', title: 'term notes', tags: '', body: 'nothing else' },
      { id: 'r-2', title: 'other notes', tags: '', body: 'term elsewhere' },
    ],
  })
  const page = index.search('term', { limit: 10 })
  assert.deepEqual(page.hits.map((hit) => hit.id), ['r-1', 'r-2'])
  assert.ok(page.hits[0].score > page.hits[1].score)
})

test('a short document outranks a long one for the same term', () => {
  const index = createIndex({
    documents: [
      { id: 'r-4', title: 'harbour', tags: '', body: 'term filler filler filler' },
      { id: 'r-3', title: 'harbour', tags: '', body: 'term' },
    ],
  })
  assert.deepEqual(index.search('term', { limit: 10 }).hits.map((hit) => hit.id), ['r-3', 'r-4'])
})

test('the same documents answer the same query in the same order', () => {
  const documents = [
    { id: 'r-3', title: 'Release notes', tags: '', body: 'shared term' },
    { id: 'r-1', title: 'Release notes', tags: '', body: 'shared term' },
    { id: 'r-2', title: 'Release notes', tags: '', body: 'shared term' },
  ]
  const forwards = createIndex({ documents })
  const backwards = createIndex({ documents: [...documents].reverse() })
  assert.deepEqual(
    backwards.search('shared', { limit: 10 }).hits.map((hit) => hit.id),
    forwards.search('shared', { limit: 10 }).hits.map((hit) => hit.id),
  )
})
