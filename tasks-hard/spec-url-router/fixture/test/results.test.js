// Reproductions for what `match` hands back.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Router } from '../src/index.js'

const route = (r, pattern, handler = pattern) => r.add('GET', pattern, handler)

test('a request nothing serves comes back as a result, not as an error', () => {
  const r = new Router()
  route(r, '/users/:id', 'byId')

  const result = r.match('GET', '/nothing/here')
  assert.equal(result.matched, false)
  assert.equal(result.pattern, null)
  assert.equal(result.handler, null)
  assert.deepEqual(result.params, {})
})

test('two matches never share the values they captured', () => {
  const r = new Router()
  route(r, '/users/:id', 'byId')

  const first = r.match('GET', '/users/1')
  const second = r.match('GET', '/users/2')
  assert.notEqual(first.params, second.params)
  assert.deepEqual(first.params, { id: '1' })
  assert.deepEqual(second.params, { id: '2' })
})
