import test from 'node:test'
import assert from 'node:assert/strict'
import { createIndex, parseQuery, tokenize } from '../src/index.js'

test('terms are lower case and split on punctuation', () => {
  assert.deepEqual(tokenize('Harbour Wall, 1998'), ['harbour', 'wall', '1998'])
  assert.deepEqual(tokenize('RFC 822 header fields'), ['rfc', '822', 'header', 'fields'])
})

test('accents are folded, so a word is found with or without them', () => {
  assert.deepEqual(tokenize('Café'), ['cafe'])

  const index = createIndex({
    documents: [
      { id: 'a-1', title: 'Café notes', tags: 'facilities', body: 'the north wing opens early' },
      { id: 'a-2', title: 'Harbour wall', tags: 'survey', body: 'the wall was surveyed in 1998' },
    ],
  })
  assert.deepEqual(index.search('cafe', { limit: 10 }).hits.map((hit) => hit.id), ['a-1'])
  assert.deepEqual(index.search('CAFÉ', { limit: 10 }).hits.map((hit) => hit.id), ['a-1'])
})

test('a query made of digits finds the document that has them', () => {
  const index = createIndex({
    documents: [
      { id: 'a-1', title: 'RFC 822 headers', tags: 'mail', body: 'the header fields defined by RFC 822' },
      { id: 'a-2', title: 'Tide tables', tags: 'survey', body: 'tide tables for 1998 and 1999' },
    ],
  })
  assert.deepEqual(index.search('822', { limit: 10 }).hits.map((hit) => hit.id), ['a-1'])
  assert.deepEqual(index.search('1998', { limit: 10 }).hits.map((hit) => hit.id), ['a-2'])
})

test('stopwords are dropped from a query and kept in the index', () => {
  const index = createIndex({
    documents: [{ id: 'a-1', title: 'the keeper log', tags: '', body: 'the log of the keeper' }],
  })
  assert.deepEqual(parseQuery('the of and').clauses, [])
  assert.equal(index.search('the').total, 0)
  assert.deepEqual(index.search('keeper', { limit: 10 }).hits.map((hit) => hit.id), ['a-1'])
})
