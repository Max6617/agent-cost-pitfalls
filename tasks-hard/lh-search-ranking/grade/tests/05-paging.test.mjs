// Sub-problem 5: limit and offset walk the whole result set, once.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createIndex } from '../src/index.js'

const build = () => createIndex({
  documents: [
    { id: 'g-1', title: 'harbour', tags: '', body: 'term' },
    { id: 'g-2', title: 'harbour', tags: '', body: 'term term' },
    { id: 'g-3', title: 'harbour', tags: '', body: 'term term term' },
    { id: 'g-4', title: 'harbour', tags: '', body: 'term term term term' },
    { id: 'g-5', title: 'harbour', tags: '', body: 'term term term term term' },
  ],
})

test('the total is the number of matches, not the size of the page', () => {
  const index = build()
  const everything = index.search('term', { limit: 100 })
  const firstPage = index.search('term', { limit: 2 })
  assert.equal(everything.total, 5)
  assert.equal(everything.hits.length, 5)
  assert.equal(firstPage.total, 5)
  assert.equal(firstPage.hits.length, 2)
  assert.equal(firstPage.limit, 2)
})

test('offset counts hits to skip, not pages', () => {
  const index = build()
  const everything = index.search('term', { limit: 100 })
  const middle = index.search('term', { limit: 2, offset: 1 })
  assert.deepEqual(
    middle.hits.map((hit) => hit.id),
    everything.hits.slice(1, 3).map((hit) => hit.id),
  )
  assert.equal(middle.offset, 1)
  assert.equal(middle.total, everything.total)
})

test('paging through the result set returns every hit once, in the same order', () => {
  const index = build()
  const everything = index.search('term', { limit: 100 })
  const walked = []
  for (let offset = 0; offset < everything.total; offset += 2) {
    walked.push(...index.search('term', { limit: 2, offset }).hits.map((hit) => hit.id))
  }
  assert.deepEqual(walked, everything.hits.map((hit) => hit.id))
})

test('a page past the end is empty and still reports the full total', () => {
  const index = build()
  const everything = index.search('term', { limit: 100 })
  const past = index.search('term', { limit: 2, offset: 50 })
  assert.equal(past.total, everything.total)
  assert.deepEqual(past.hits, [])
  assert.equal(past.offset, 50)

  const none = index.search('nothingmatchesthis', { limit: 2, offset: 3 })
  assert.equal(none.total, 0)
  assert.deepEqual(none.hits, [])
})
