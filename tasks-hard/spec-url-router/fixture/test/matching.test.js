// Reproductions for the route table: what a pattern captures out of a path and
// how a literal segment is compared. Support reduced these out of the bug
// reports; they are the easy end of what the framework checks.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Router } from '../src/index.js'

const route = (r, pattern, handler = pattern) => r.add('GET', pattern, handler)

test('a literal segment and a parameter capture their parts of the path', () => {
  const r = new Router()
  route(r, '/users/:id', 'getUser')

  const result = r.match('GET', '/users/42')
  assert.equal(result.matched, true)
  assert.equal(result.handler, 'getUser')
  assert.equal(result.pattern, '/users/:id')
  assert.deepEqual(result.params, { id: '42' })
})

test('literals are compared case-sensitively unless the router is asked otherwise', () => {
  const strict = new Router()
  route(strict, '/users/:id', 'getUser')
  assert.equal(strict.match('GET', '/Users/42').matched, false)

  const loose = new Router({ caseSensitive: false })
  route(loose, '/users/:id', 'getUser')
  assert.equal(loose.match('GET', '/Users/42').matched, true)
})

test('a captured value is decoded, exactly once', () => {
  const r = new Router()
  route(r, '/p/:value', 'p')

  assert.deepEqual(r.match('GET', '/p/a%20b').params, { value: 'a b' })
  assert.deepEqual(r.match('GET', '/p/a%2520b').params, { value: 'a%20b' })
})
