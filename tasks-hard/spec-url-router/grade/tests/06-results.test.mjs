// Sub-problem 6: the shape of what `match` returns, the query it carries, and
// which table the method selects.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Router } from '../src/index.js'

const KEYS = ['handler', 'matched', 'method', 'params', 'path', 'pattern', 'query']

test('a matched result carries the documented keys and the captured values', () => {
  const router = new Router()
  router.add('GET', '/users/:id', 'byId')

  const result = router.match('GET', '/users/42?page=2')
  assert.deepEqual(Object.keys(result).sort(), KEYS)
  assert.equal(result.matched, true)
  assert.equal(result.method, 'GET')
  assert.equal(result.path, '/users/42')
  assert.equal(result.pattern, '/users/:id')
  assert.equal(result.handler, 'byId')
  assert.deepEqual(result.params, { id: '42' })
  assert.deepEqual(result.query, { page: '2' })
})

test('a request nothing serves is a result too, with the same keys', () => {
  const router = new Router()
  router.add('GET', '/users/:id', 'byId')

  const result = router.match('GET', '/nothing/here/?page=2')
  assert.equal(result.matched, false)
  assert.equal(result.pattern, null)
  assert.equal(result.handler, null)
  assert.deepEqual(result.params, {})
  assert.deepEqual(Object.keys(result).sort(), KEYS)
  assert.equal(result.path, '/nothing/here')
  assert.deepEqual(result.query, { page: '2' })
  assert.equal(result.method, 'GET')
})

test('the fragment is ignored, and a query inside it is not a query', () => {
  const router = new Router()
  router.add('GET', '/a/:p', 'byP')

  const inside = router.match('GET', '/a/b#frag?x=1')
  assert.equal(inside.matched, true)
  assert.equal(inside.path, '/a/b')
  assert.deepEqual(inside.params, { p: 'b' })
  assert.deepEqual(inside.query, {})

  const after = router.match('GET', '/a/b?x=1#frag')
  assert.equal(after.path, '/a/b')
  assert.deepEqual(after.query, { x: '1' })

  const malformed = router.match('GET', '/a/b#%ZZ')
  assert.equal(malformed.matched, true)
  assert.deepEqual(malformed.query, {})
})

test('the method is upper-cased, and HEAD falls back to the GET table', () => {
  const router = new Router()
  router.add('HEAD', '/health', 'healthHead')
  router.add('GET', '/health', 'healthGet')
  router.add('GET', '/users/:id', 'getUser')
  router.add('DELETE', '/users/:id', 'deleteUser')

  assert.equal(router.match('get', '/users/42').handler, 'getUser')
  assert.equal(router.match('HEAD', '/users/42').handler, 'getUser')
  assert.equal(router.match('head', '/health').handler, 'healthHead')
  assert.equal(router.match('GET', '/health').handler, 'healthGet')
  assert.equal(router.match('DELETE', '/users/42').handler, 'deleteUser')
  assert.equal(router.match('POST', '/users/42').matched, false)
})
