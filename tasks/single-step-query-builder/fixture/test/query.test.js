import test from 'node:test'
import assert from 'node:assert/strict'
import { buildQuery, parseQuery, withQuery, encodeComponent } from '../src/query.js'

test('a simple pair is built', () => {
  assert.equal(buildQuery({ q: 'tea' }), 'q=tea')
})

test('pairs are joined with an ampersand in insertion order', () => {
  assert.equal(buildQuery({ q: 'tea', page: 2 }), 'q=tea&page=2')
})

test('a space is encoded as %20, never as a plus', () => {
  assert.equal(buildQuery({ q: 'a b' }), 'q=a%20b')
  assert.equal(buildQuery({ q: 'a b' }).includes('+'), false)
})

test('reserved characters are encoded', () => {
  assert.equal(buildQuery({ q: 'a&b=c' }), 'q=a%26b%3Dc')
  assert.equal(encodeComponent('a/b?c'), 'a%2Fb%3Fc')
})

test('a repeated parameter appears once per value', () => {
  assert.equal(buildQuery({ tag: ['a', 'b'] }), 'tag=a&tag=b')
})

test('an empty list contributes nothing', () => {
  assert.equal(buildQuery({ tag: [], q: 'x' }), 'q=x')
})

test('an explicit true is a bare key, an explicit false is dropped', () => {
  assert.equal(buildQuery({ fuzzy: true, exact: false }), 'fuzzy')
})

test('null and undefined are dropped', () => {
  assert.equal(buildQuery({ a: null, b: undefined, c: 1 }), 'c=1')
})

test('a value of zero is kept', () => {
  assert.equal(buildQuery({ page: 0 }), 'page=0')
})

test('an empty string value is kept', () => {
  assert.equal(buildQuery({ q: '' }), 'q=')
})

test('no parameters makes an empty string', () => {
  assert.equal(buildQuery({}), '')
  assert.equal(buildQuery(), '')
})

test('a query string round-trips through the parser', () => {
  const query = buildQuery({ q: 'a b', tag: ['x', 'y'] })
  assert.deepEqual(parseQuery(query), { q: 'a b', tag: 'y' })
})

test('a URL keeps its path and replaces an existing query', () => {
  assert.equal(withQuery('https://api.example.com/search?old=1', { q: 'tea' }), 'https://api.example.com/search?q=tea')
  assert.equal(withQuery('https://api.example.com/search', { q: 'tea' }), 'https://api.example.com/search?q=tea')
})

test('a URL with no parameters loses its question mark', () => {
  assert.equal(withQuery('https://api.example.com/search?old=1', {}), 'https://api.example.com/search')
})

test('a bare key parses back as true', () => {
  assert.deepEqual(parseQuery('fuzzy'), { fuzzy: true })
})
