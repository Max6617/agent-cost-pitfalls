// Sub-problem 4: negation excludes, all-negative queries still match, and an
// empty query is not an error.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createIndex } from '../src/index.js'

const documents = () => [
  { id: 'b-1', title: 'lighthouse keeper', tags: '', body: 'the keeper of the lighthouse' },
  { id: 'b-2', title: 'cat welfare', tags: '', body: 'lighthouse cats are rare' },
  { id: 'b-3', title: 'concatenate strings', tags: '', body: 'lighthouse run notes' },
  { id: 'b-4', title: 'harbour wall', tags: '', body: 'survey notes' },
  { id: 'b-5', title: 'draft lighthouse plan', tags: 'draft', body: 'a draft of the lighthouse plan' },
]

test('a query with only negated clauses matches every document that is not excluded', () => {
  const index = createIndex({ documents: documents() })
  const page = index.search('-cat', { limit: 10 })
  assert.equal(page.total, 4)
  assert.deepEqual(page.hits.map((hit) => hit.id), ['b-1', 'b-3', 'b-4', 'b-5'])
  assert.deepEqual(
    index.search('-cat -survey', { limit: 10 }).hits.map((hit) => hit.id),
    ['b-1', 'b-3', 'b-5'],
  )
})

test('a negated term excludes the term, not every word that contains it', () => {
  const index = createIndex({ documents: documents() })
  assert.deepEqual(
    index.search('lighthouse -cat', { limit: 10 }).hits.map((hit) => hit.id).sort(),
    ['b-1', 'b-3', 'b-5'],
  )
  assert.deepEqual(
    index.search('lighthouse -concatenate', { limit: 10 }).hits.map((hit) => hit.id).sort(),
    ['b-1', 'b-2', 'b-5'],
  )
})

test('a negated clause is excluded before the page is cut, and the total counts what is left', () => {
  const index = createIndex({ documents: documents() })
  const first = index.search('lighthouse -cat', { limit: 2 })
  const second = index.search('lighthouse -cat', { limit: 2, offset: 2 })
  assert.equal(first.total, 3)
  assert.equal(second.total, 3)
  assert.equal(first.hits.length, 2)
  assert.equal(second.hits.length, 1)
  const seen = [...first.hits, ...second.hits].map((hit) => hit.id).sort()
  assert.deepEqual(seen, ['b-1', 'b-3', 'b-5'])
})

test('a negated clause is matched the same way a positive one is, folding included', () => {
  const index = createIndex({
    documents: [
      { id: 'n-1', title: 'Café noir', tags: '', body: 'lighthouse blend' },
      { id: 'n-2', title: 'decaffeinated', tags: '', body: 'lighthouse blend' },
      { id: 'n-3', title: 'keeper notes', tags: '', body: 'lighthouse log' },
    ],
  })
  assert.deepEqual(
    index.search('lighthouse -café', { limit: 10 }).hits.map((hit) => hit.id).sort(),
    ['n-2', 'n-3'],
  )
  assert.deepEqual(
    index.search('lighthouse -CAFE', { limit: 10 }).hits.map((hit) => hit.id).sort(),
    ['n-2', 'n-3'],
  )
})
