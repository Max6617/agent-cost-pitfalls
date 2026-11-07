// Sub-problem 3: the documented score, and the documented order.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createIndex } from '../src/index.js'

const closeTo = (got, want, what) => {
  const slack = 1e-6 * Math.max(1, Math.abs(want))
  assert.ok(Math.abs(got - want) <= slack, what + ': ' + got + ' is not within ' + slack + ' of ' + want)
}

test('a shorter document outranks a longer one for the same term', () => {
  const index = createIndex({
    documents: [
      { id: 'k-2', title: 'harbour', tags: '', body: 'term filler filler filler' },
      { id: 'k-1', title: 'harbour', tags: '', body: 'term' },
    ],
  })
  const page = index.search('term', { limit: 10 })
  assert.deepEqual(page.hits.map((hit) => hit.id), ['k-1', 'k-2'])
  assert.ok(page.hits[0].score > page.hits[1].score)
})

test('a term found in two fields is worth the sum of both field contributions', () => {
  const index = createIndex({
    documents: [
      { id: 'd-1', title: 'alpha beta', tags: 'gamma', body: 'alpha delta' },
      { id: 'd-2', title: 'zeta', tags: 'eta', body: 'alpha theta iota' },
      { id: 'd-3', title: 'nu', tags: 'xi', body: 'omicron pi' },
    ],
  })
  const page = index.search('alpha', { limit: 10 })
  assert.deepEqual(page.hits.map((hit) => hit.id), ['d-1', 'd-2'])
  closeTo(page.hits[0].score, 0.8111002538601292, 'score of d-1')
  closeTo(page.hits[1].score, 0.2027750634650323, 'score of d-2')
})

test('a rare term outweighs a common one', () => {
  const index = createIndex({
    documents: [
      { id: 'c-1', title: 'aardvark', tags: '', body: 'common term here' },
      { id: 'c-2', title: 'badger', tags: '', body: 'common term here' },
      { id: 'c-3', title: 'cormorant', tags: '', body: 'common term here' },
      { id: 'c-4', title: 'dormouse', tags: '', body: 'common term here' },
      { id: 'c-5', title: 'eagle', tags: '', body: 'common term here' },
      { id: 'c-6', title: 'falcon', tags: '', body: 'common term here' },
      { id: 'c-7', title: 'gannet', tags: '', body: 'common term here' },
      { id: 'z-9', title: 'zebra memo', tags: '', body: 'rare term here' },
    ],
  })
  const page = index.search('common rare', { limit: 20 })
  assert.equal(page.total, 8)
  assert.deepEqual(page.hits.map((hit) => hit.id), ['z-9', 'c-1', 'c-2', 'c-3', 'c-4', 'c-5', 'c-6', 'c-7'])
})

test('documents that score the same come back in id order, whatever the index has been through', () => {
  const documents = [
    { id: 't-3', title: 'Release notes', tags: '', body: 'shared term' },
    { id: 't-1', title: 'Release notes', tags: '', body: 'shared term' },
    { id: 't-2', title: 'Release notes', tags: '', body: 'shared term' },
  ]
  const forwards = createIndex({ documents })
  const backwards = createIndex({ documents: [...documents].reverse() })
  assert.deepEqual(forwards.search('shared', { limit: 10 }).hits.map((hit) => hit.id), ['t-1', 't-2', 't-3'])
  assert.deepEqual(backwards.search('shared', { limit: 10 }).hits.map((hit) => hit.id), ['t-1', 't-2', 't-3'])

  forwards.remove('t-1')
  forwards.add({ id: 't-1', title: 'Release notes', tags: '', body: 'shared term' })
  assert.deepEqual(forwards.search('shared', { limit: 10 }).hits.map((hit) => hit.id), ['t-1', 't-2', 't-3'])
})

test('removing a document moves the average length the scores are normalised against', () => {
  const index = createIndex({
    documents: [
      { id: 's-1', title: 'short', tags: '', body: 'omega' },
      { id: 's-2', title: 'long', tags: '', body: 'omega filler filler filler filler filler filler filler filler filler' },
      { id: 's-3', title: 'other', tags: '', body: 'nothing here' },
    ],
  })
  assert.ok(index.search('omega', { limit: 10 }).hits.length === 2)

  assert.equal(index.remove('s-2'), true)
  assert.equal(index.stats().documents, 2)
  const page = index.search('omega', { limit: 10 })
  assert.deepEqual(page.hits.map((hit) => hit.id), ['s-1'])
  closeTo(page.hits[0].score, 0.3706669414759065, 'score of s-1 after the removal')
})
