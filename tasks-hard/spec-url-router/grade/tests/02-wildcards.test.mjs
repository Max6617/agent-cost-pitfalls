// Sub-problem 2: wildcards and catch-alls, and the patterns the router refuses.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Router } from '../src/index.js'

test('a wildcard takes exactly one segment', () => {
  const router = new Router()
  router.add('GET', '/files/*name', 'byName')

  assert.deepEqual(router.match('GET', '/files/readme').params, { name: 'readme' })
  assert.equal(router.match('GET', '/files/a/b').matched, false)
  assert.equal(router.match('GET', '/files').matched, false)
})

test('a catch-all takes zero or more segments', () => {
  const router = new Router()
  router.add('GET', '/files/**rest', 'byRest')

  const nothing = router.match('GET', '/files')
  assert.equal(nothing.matched, true)
  assert.equal(nothing.handler, 'byRest')
  assert.deepEqual(nothing.params, { rest: '' })

  assert.deepEqual(router.match('GET', '/files/').params, { rest: '' })
  assert.deepEqual(router.match('GET', '/files/a/b/c').params, { rest: 'a/b/c' })
})

test('a catch-all is refused anywhere but at the end, and needs a name', () => {
  const router = new Router()

  assert.throws(() => router.add('GET', '/files/**rest/edit', 'x'), { name: 'RouteError' })
  assert.throws(() => router.add('GET', '/a/*', 'x'), { name: 'RouteError' })
  assert.throws(() => router.add('GET', '/a/**', 'x'), { name: 'RouteError' })

  router.add('GET', '/a/*name', 'ok')
  assert.equal(router.match('GET', '/a/x').handler, 'ok')
})

test('a catch-all decodes each segment it took once and joins them with a slash', () => {
  const router = new Router()
  router.add('GET', '/files/**rest', 'byRest')

  assert.deepEqual(router.match('GET', '/files/a%2520b/c').params, { rest: 'a%20b/c' })
  assert.deepEqual(router.match('GET', '/files/dir%2Fsub/readme').params, { rest: 'dir/sub/readme' })
})
