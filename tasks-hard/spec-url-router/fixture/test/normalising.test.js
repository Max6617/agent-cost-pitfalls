// Reproductions for how a request target is folded into the path the route
// table is written in.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Router } from '../src/index.js'

const route = (r, pattern, handler = pattern) => r.add('GET', pattern, handler)

test('the query string is not part of the path but it is on the result', () => {
  const r = new Router()
  route(r, '/users/:id', 'byId')

  const result = r.match('GET', '/users/42?page=2&sort=name')
  assert.equal(result.matched, true)
  assert.equal(result.path, '/users/42')
  assert.deepEqual(result.params, { id: '42' })
  assert.deepEqual(result.query, { page: '2', sort: 'name' })
})

test('a trailing slash does not stop a route from matching', () => {
  const r = new Router()
  route(r, '/users/:id', 'byId')

  const result = r.match('GET', '/users/42/')
  assert.equal(result.matched, true)
  assert.deepEqual(result.params, { id: '42' })
})

test('a run of slashes is one slash, and a path need not start with one', () => {
  const r = new Router()
  route(r, '/a/:x/b', 'byX')

  assert.deepEqual(r.match('GET', '/a//1//b').params, { x: '1' })
  assert.deepEqual(r.match('GET', 'a/1/b').params, { x: '1' })
})
