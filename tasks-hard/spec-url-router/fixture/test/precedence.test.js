// Reproductions for the cases where more than one pattern matches the same
// path. This is where handlers started coming back wrong.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Router } from '../src/index.js'

const route = (r, pattern, handler = pattern) => r.add('GET', pattern, handler)

test('a literal route beats a parameter route', () => {
  const r = new Router()
  route(r, '/users/:id', 'byId')
  route(r, '/users/new', 'newUser')

  assert.equal(r.match('GET', '/users/new').handler, 'newUser')
})

test('a parameter route beats a catch-all', () => {
  const r = new Router()
  route(r, '/files/:name', 'byName')
  route(r, '/files/**rest', 'byRest')

  assert.equal(r.match('GET', '/files/readme').handler, 'byName')
})

test('two equally specific routes are separated by declaration order', () => {
  const r = new Router()
  route(r, '/a/:p', 'first')
  route(r, '/a/{p}', 'second')

  assert.equal(r.match('GET', '/a/1').handler, 'first')
})
