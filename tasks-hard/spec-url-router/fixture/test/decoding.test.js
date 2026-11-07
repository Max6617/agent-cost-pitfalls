// Reproductions for reading the text of a request target: percent escapes and
// the characters that are not escapes at all.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Router } from '../src/index.js'

const route = (r, pattern, handler = pattern) => r.add('GET', pattern, handler)

test('a plus is a space in a query value and a plus in a path segment', () => {
  const r = new Router()
  route(r, '/q/:value', 'q')

  assert.deepEqual(r.match('GET', '/q/1?v=a+b').query, { v: 'a b' })
  assert.deepEqual(r.match('GET', '/q/a+b').params, { value: 'a+b' })
})

test('a malformed escape is refused rather than passed through', () => {
  const r = new Router()
  route(r, '/q/:value', 'q')

  assert.throws(() => r.match('GET', '/q/%ZZ'), { name: 'MalformedEscapeError' })
})
