import test from 'node:test'
import assert from 'node:assert/strict'
import { createIndex } from '../src/index.js'

const build = () => createIndex({
  documents: [
    { id: 'g-1', title: 'harbour', tags: '', body: 'term' },
    { id: 'g-2', title: 'harbour', tags: '', body: 'term term' },
    { id: 'g-3', title: 'harbour', tags: '', body: 'term term term' },
    { id: 'g-4', title: 'harbour', tags: '', body: 'term term term term' },
  ],
})

test('the total is the number of matches, not the size of the page', () => {
  const index = build()
  const page = index.search('term', { limit: 2 })
  assert.equal(page.total, 4)
  assert.equal(page.hits.length, 2)
})

test('offset skips hits, not pages', () => {
  const index = build()
  const everything = index.search('term', { limit: 100 })
  const middle = index.search('term', { limit: 2, offset: 1 })
  assert.deepEqual(
    middle.hits.map((hit) => hit.id),
    everything.hits.slice(1, 3).map((hit) => hit.id),
  )
})

test('paging through the result set returns every hit once', () => {
  const index = build()
  const everything = index.search('term', { limit: 100 })
  const walked = []
  for (let offset = 0; offset < everything.total; offset += 2) {
    walked.push(...index.search('term', { limit: 2, offset }).hits.map((hit) => hit.id))
  }
  assert.deepEqual(walked, everything.hits.map((hit) => hit.id))
})
