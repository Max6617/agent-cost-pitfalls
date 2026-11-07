// Reproductions for pattern syntax: wildcards, catch-alls, and what the router
// refuses to register at all.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Router } from '../src/index.js'

const route = (r, pattern, handler = pattern) => r.add('GET', pattern, handler)

test('a wildcard captures one segment', () => {
  const r = new Router()
  route(r, '/files/*name', 'byName')

  const result = r.match('GET', '/files/readme')
  assert.equal(result.matched, true)
  assert.deepEqual(result.params, { name: 'readme' })
})

test('a catch-all also matches when there is nothing left', () => {
  const r = new Router()
  route(r, '/files/**rest', 'byRest')

  const result = r.match('GET', '/files')
  assert.equal(result.matched, true)
  assert.deepEqual(result.params, { rest: '' })
})

test('a catch-all is only legal as the last segment', () => {
  const r = new Router()
  assert.throws(() => route(r, '/files/**rest/edit'), { name: 'RouteError' })
})
