import test from 'node:test'
import assert from 'node:assert/strict'
import { match } from '../src/index.js'

test('a class matches one character from its set', () => {
  assert.equal(match('file[0-9].txt', 'file3.txt'), true)
  assert.equal(match('file[0-9].txt', 'fileA.txt'), false)
  assert.equal(match('[a-c].js', 'b.js'), true)
  assert.equal(match('[a-c].js', 'd.js'), false)
})

test('a dash at the edge of a class is an ordinary member', () => {
  assert.equal(match('[-x]y', '-y'), true)
  assert.equal(match('[-x]y', 'xy'), true)
  assert.equal(match('[x-]y', '-y'), true)
})
