// Sub-problem 3: which of several matching routes wins.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Router } from '../src/index.js'

test('a literal beats a parameter at the same position', () => {
  const router = new Router()
  router.add('GET', '/users/:id', 'byId')
  router.add('GET', '/users/new', 'newUser')

  assert.equal(router.match('GET', '/users/new').handler, 'newUser')
  assert.equal(router.match('GET', '/users/new').params.id, undefined)
})

test('the leftmost position decides, not the number of literal segments', () => {
  const router = new Router()
  router.add('GET', '/:p/b/c', 'middlePinned')
  router.add('GET', '/a/:q/:r', 'leftPinned')

  const result = router.match('GET', '/a/b/c')
  assert.equal(result.handler, 'leftPinned')
  assert.deepEqual(result.params, { q: 'b', r: 'c' })
})

test('a wildcard beats a catch-all when both could take the same segment', () => {
  const router = new Router()
  router.add('GET', '/a/*w', 'byWildcard')
  router.add('GET', '/a/**r', 'byCatchAll')

  assert.equal(router.match('GET', '/a/x').handler, 'byWildcard')
  assert.deepEqual(router.match('GET', '/a/x').params, { w: 'x' })
})

test('two routes that consume the same segments the same way are separated by declaration order', () => {
  const requiredFirst = new Router()
  requiredFirst.add('GET', '/x/:p', 'requiredFirst')
  requiredFirst.add('GET', '/x/{p}', 'optionalSecond')
  assert.equal(requiredFirst.match('GET', '/x/1').handler, 'requiredFirst')

  const optionalFirst = new Router()
  optionalFirst.add('GET', '/x/{p}', 'optionalFirst')
  optionalFirst.add('GET', '/x/:p', 'requiredSecond')
  assert.equal(optionalFirst.match('GET', '/x/1').handler, 'optionalFirst')
})

test('an escaped marker is literal text, and a literal beats a parameter', () => {
  const marker = new Router()
  marker.add('GET', '/time/:zone', 'byZone')
  marker.add('GET', '/time/\\:now', 'byLiteralColon')

  const result = marker.match('GET', '/time/:now')
  assert.equal(result.handler, 'byLiteralColon')
  assert.deepEqual(result.params, {})

  const star = new Router()
  star.add('GET', '/a/*star', 'byWildcard')
  star.add('GET', '/a/\\*star', 'byLiteralStar')
  assert.equal(star.match('GET', '/a/*star').handler, 'byLiteralStar')
})
