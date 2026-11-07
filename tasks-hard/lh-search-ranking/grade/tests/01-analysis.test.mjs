// Sub-problem 1: folding, tokenising, and where the stopword list applies.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createIndex, parseQuery, tokenize } from '../src/index.js'

test('tokenising folds case and accents, splits punctuation and keeps digits together', () => {
  assert.deepEqual(tokenize('Café Society — Vol. 2 (rev 3)'), ['cafe', 'society', 'vol', '2', 'rev', '3'])
  assert.deepEqual(tokenize("don't stop the keeper"), ['don', 't', 'stop', 'the', 'keeper'])
  assert.deepEqual(tokenize('SCORE: 10 of 12'), ['score', '10', 'of', '12'])
})

test('an accented word is found from either spelling', () => {
  const index = createIndex({
    documents: [
      { id: 'x-1', title: 'Café notes', tags: 'facilities', body: 'the north wing opens early' },
      { id: 'x-2', title: 'Harbour cafe', tags: 'facilities', body: 'the south wing closes late' },
    ],
  })
  const found = (query) => index.search(query, { limit: 10 }).hits.map((hit) => hit.id).sort()
  assert.deepEqual(found('cafe'), ['x-1', 'x-2'])
  assert.deepEqual(found('café'), ['x-1', 'x-2'])
  assert.deepEqual(found('CAFÉ'), ['x-1', 'x-2'])
})

test('digits are part of a term, in the index and in a query', () => {
  const index = createIndex({
    documents: [
      { id: 'y-1', title: 'RFC 822 headers', tags: 'mail', body: 'the header fields defined by RFC 822' },
      { id: 'y-2', title: 'Harbour survey', tags: 'survey', body: 'the wall was surveyed in 1998' },
      { id: 'y-3', title: 'Tide tables', tags: 'survey', body: 'tide tables for 1998 and 1999' },
    ],
  })
  const found = (query) => index.search(query, { limit: 10 }).hits.map((hit) => hit.id).sort()
  assert.deepEqual(found('822'), ['y-1'])
  assert.deepEqual(found('rfc 822'), ['y-1'])
  assert.deepEqual(found('1998'), ['y-2', 'y-3'])
})

test('folding and phrase adjacency agree: a phrase is matched on folded terms inside one field', () => {
  const index = createIndex({
    documents: [
      { id: 'z-1', title: 'Café noir', tags: 'coffee', body: 'brewed dark' },
      { id: 'z-2', title: 'Café', tags: 'coffee', body: 'noir beans only' },
      { id: 'z-3', title: 'Noir', tags: 'coffee', body: 'a café on the corner' },
    ],
  })
  const found = (query) => index.search(query, { limit: 10 }).hits.map((hit) => hit.id)
  assert.deepEqual(found('"café noir"'), ['z-1'])
  assert.deepEqual(found('"cafe noir"'), ['z-1'])
})

test('the stopword list filters queries and never indexed text', () => {
  const index = createIndex({
    documents: [{ id: 'w-1', title: 'the keeper log', tags: '', body: 'the log of the keeper' }],
  })
  assert.deepEqual(tokenize('the of the keeper'), ['the', 'of', 'the', 'keeper'])
  assert.deepEqual(parseQuery('the of and').clauses, [])
  assert.equal(index.search('the').total, 0)
  assert.equal(index.search('the of and').hits.length, 0)
  assert.deepEqual(index.search('keeper', { limit: 10 }).hits.map((hit) => hit.id), ['w-1'])
})
