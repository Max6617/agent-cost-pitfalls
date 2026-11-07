// Sub-problem 5: decoding captured values and query strings.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Router } from '../src/index.js'

test('a captured value is decoded exactly once', () => {
  const router = new Router()
  router.add('GET', '/p/:value', 'byValue')

  assert.deepEqual(router.match('GET', '/p/a%2520b').params, { value: 'a%20b' })
  assert.deepEqual(router.match('GET', '/p/100%25').params, { value: '100%' })
  assert.deepEqual(router.match('GET', '/p/caf%C3%A9').params, { value: 'café' })
})

test('a plus is a plus in a path and a space in a query', () => {
  const router = new Router()
  router.add('GET', '/q/:value', 'byValue')

  assert.deepEqual(router.match('GET', '/q/a+b').params, { value: 'a+b' })
  assert.deepEqual(router.match('GET', '/q/1?v=a+b&raw=%2B').query, { v: 'a b', raw: '+' })
})

test('a malformed escape is refused, and names the text that is malformed', () => {
  const router = new Router()
  router.add('GET', '/q/:value', 'byValue')

  assert.throws(() => router.match('GET', '/q/%ZZ'), (error) => {
    return error.name === 'MalformedEscapeError' && error.raw === '%ZZ'
  })
  assert.throws(() => router.match('GET', '/q/1?x=%'), (error) => {
    return error.name === 'MalformedEscapeError' && error.raw === '%'
  })
  assert.throws(() => router.match('GET', '/q/%E0%A4'), { name: 'MalformedEscapeError' })
  // nothing would have matched this path, and it is still refused
  assert.throws(() => router.match('GET', '/nowhere/%ZZ'), { name: 'MalformedEscapeError' })

  assert.equal(router.match('GET', '/q/1').matched, true)
})

test('query keys are decoded, and a repeated key keeps every value', () => {
  const router = new Router()
  router.add('GET', '/q/:value', 'byValue')

  assert.deepEqual(router.match('GET', '/q/1?a%20b=1').query, { 'a b': '1' })
  assert.deepEqual(router.match('GET', '/q/1?tag=x&tag=y&tag=z').query, { tag: ['x', 'y', 'z'] })
  assert.deepEqual(router.match('GET', '/q/1?one=1').query, { one: '1' })
  assert.deepEqual(router.match('GET', '/q/1?flag&empty=').query, { flag: '', empty: '' })
})
