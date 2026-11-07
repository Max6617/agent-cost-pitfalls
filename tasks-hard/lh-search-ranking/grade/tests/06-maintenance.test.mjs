// Sub-problem 6: what the index derives stays true as documents come and go.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createIndex } from '../src/index.js'

const LONG = 'a very long body with many many many many words indeed'

const build = () => createIndex({
  documents: [
    { id: 'm-1', title: 'alpha', tags: '', body: 'alpha beta' },
    { id: 'm-2', title: 'gamma', tags: '', body: 'delta epsilon' },
    { id: 'm-3', title: 'zeta', tags: '', body: 'eta theta' },
  ],
})

test('document frequency counts documents, however many fields mention the term', () => {
  const index = build()
  assert.equal(index.documentFrequency('alpha'), 1)
  assert.equal(index.documentFrequency('beta'), 1)
  assert.equal(index.documentFrequency('gamma'), 1)
  assert.equal(index.documentFrequency('nothingmentionsthis'), 0)
})

test('removing the last document that mentions a term removes the term', () => {
  const index = build()
  const before = index.stats().terms
  index.add({ id: 'm-4', title: 'zebra', tags: '', body: LONG })
  assert.equal(index.documentFrequency('zebra'), 1)

  assert.equal(index.remove('m-4'), true)
  assert.equal(index.stats().documents, 3)
  assert.equal(index.documentFrequency('zebra'), 0)
  assert.equal(index.stats().terms, before)
  assert.deepEqual(index.search('zebra').hits, [])
})

test('the average length is the mean over the live documents right now', () => {
  const index = build()
  assert.equal(index.stats().averageLength, 3)
  index.add({ id: 'm-4', title: 'zebra', tags: '', body: LONG })
  assert.equal(index.stats().documents, 4)
  assert.equal(index.stats().averageLength, 5.25)
  assert.equal(index.remove('m-4'), true)
  assert.equal(index.stats().averageLength, 3)
})

test('updating a document takes its old text out of the index', () => {
  const index = build()
  assert.equal(index.update('m-1', { title: 'omega', body: 'psi chi' }), true)
  assert.deepEqual(index.search('alpha').hits, [])
  assert.deepEqual(index.search('beta').hits, [])
  assert.deepEqual(index.search('omega', { limit: 10 }).hits.map((hit) => hit.id), ['m-1'])
  assert.equal(index.search('omega').total, 1)
  assert.equal(index.update('gone', { body: 'x' }), false)
})
