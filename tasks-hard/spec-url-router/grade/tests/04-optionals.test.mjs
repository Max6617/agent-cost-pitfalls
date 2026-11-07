// Sub-problem 4: optional segments, and the slashes around a path.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Router } from '../src/index.js'

test('an optional segment in the middle may be left out, and takes a segment when there is one', () => {
  const router = new Router()
  router.add('GET', '/a/{b}/c', 'byB')

  const absent = router.match('GET', '/a/c')
  assert.equal(absent.matched, true)
  assert.equal(absent.handler, 'byB')
  assert.deepEqual(absent.params, {})

  assert.deepEqual(router.match('GET', '/a/x/c').params, { b: 'x' })
})

test('whether an optional segment participates decides which route is more specific', () => {
  const router = new Router()
  router.add('GET', '/a/{b}/c', 'withOptional')
  router.add('GET', '/a/**rest', 'byCatchAll')

  const result = router.match('GET', '/a/c')
  assert.equal(result.handler, 'withOptional')
  assert.deepEqual(result.params, {})
})

test('runs of slashes are one slash on both sides, and a path need not start with one', () => {
  const router = new Router()
  router.add('GET', '/a/:x/b', 'byX')
  router.add('GET', '//dup/:y', 'byY')

  assert.deepEqual(router.match('GET', '/a//1//b').params, { x: '1' })
  assert.deepEqual(router.match('GET', 'a/1/b').params, { x: '1' })
  assert.equal(router.match('GET', '/dup/2').handler, 'byY')
  assert.equal(router.match('GET', '//dup//2/').handler, 'byY')
})

test('a trailing slash does not change which route wins', () => {
  const router = new Router()
  router.add('GET', '/users/**rest', 'byRest')
  router.add('GET', '/users/:id', 'byId')

  const result = router.match('GET', '/users/42/')
  assert.equal(result.handler, 'byId')
  assert.deepEqual(result.params, { id: '42' })
  assert.equal(router.match('GET', '/users/42').handler, 'byId')
})
