// Sub-problem 1: literal segments, parameters, and how literals are compared.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Router } from '../src/index.js'

test('a literal and a parameter capture their parts of the path', () => {
  const router = new Router()
  router.add('GET', '/users/:id', 'byId')

  const result = router.match('GET', '/users/42')
  assert.equal(result.matched, true)
  assert.equal(result.method, 'GET')
  assert.equal(result.handler, 'byId')
  assert.equal(result.pattern, '/users/:id')
  assert.deepEqual(result.params, { id: '42' })
})

test('a percent-encoded slash is part of a value, never a segment boundary', () => {
  const router = new Router()
  router.add('GET', '/files/:name/edit', 'edit')
  router.add('GET', '/files/:a/:b/:c', 'deep')

  const result = router.match('GET', '/files/dir%2Fsub/edit')
  assert.equal(result.handler, 'edit')
  assert.deepEqual(result.params, { name: 'dir/sub' })

  // the encoded slash did not turn one segment into two, so the deeper pattern
  // still needs four segments and cannot have matched
  assert.equal(router.match('GET', '/files/a%2Fb/edit').handler, 'edit')
})

test('literal segments are compared case-sensitively by default', () => {
  const router = new Router()
  router.add('GET', '/Users/:id', 'byId')

  assert.equal(router.match('GET', '/Users/42').matched, true)
  assert.equal(router.match('GET', '/users/42').matched, false)
})

test('caseSensitive: false folds literals and leaves captured values alone', () => {
  const router = new Router({ caseSensitive: false })
  router.add('GET', '/Users/:name', 'byName')

  const result = router.match('GET', '/users/Alice')
  assert.equal(result.matched, true)
  assert.deepEqual(result.params, { name: 'Alice' })
})
