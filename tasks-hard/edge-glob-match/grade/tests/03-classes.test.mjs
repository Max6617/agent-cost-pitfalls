// Sub-problem 3: character classes.
import test from 'node:test'
import assert from 'node:assert/strict'
import { match } from '../src/index.js'

test('a class matches one character from its set', () => {
  assert.equal(match('file[0-9].txt', 'file3.txt'), true)
  assert.equal(match('file[0-9].txt', 'fileA.txt'), false)
  assert.equal(match('[abc].js', 'b.js'), true)
  assert.equal(match('[abc].js', 'd.js'), false)
  assert.equal(match('report[-_].txt', 'report-.txt'), true)
  assert.equal(match('report[-_].txt', 'report_.txt'), true)
  assert.equal(match('release[0-9][0-9].tar', 'release07.tar'), true)
  assert.equal(match('release[0-9][0-9].tar', 'release7.tar'), false)
  assert.equal(match('a[bc', 'a[bc'), true)
  assert.equal(match('a[bc', 'abc'), false)
})

test('a negated class', () => {
  assert.equal(match('file[!0-9].txt', 'fileA.txt'), true)
  assert.equal(match('file[!0-9].txt', 'file3.txt'), false)
  assert.equal(match('file[^0-9].txt', 'fileA.txt'), true)
  assert.equal(match('file[^0-9].txt', 'file7.txt'), false)
  assert.equal(match('a[!a-c]z', 'axz'), true)
  assert.equal(match('a[!a-c]z', 'abz'), false)
  assert.equal(match('[!.]env', 'xenv'), true)
  assert.equal(match('[!.]env', '.env'), false)
})

test('a closing bracket as the first member of a class is a literal', () => {
  assert.equal(match('a[]]b', 'a]b'), true)
  assert.equal(match('a[]]b', 'ab'), false)
  assert.equal(match('a[]]b', 'a]cb'), false)
  assert.equal(match('[!]]', 'x'), true)
  assert.equal(match('[!]]', ']'), false)
  assert.equal(match('notes[[]1].txt', 'notes[1].txt'), true)
  assert.equal(match('notes[[]1].txt', 'notes1].txt'), false)
})

test('a class never matches a separator', () => {
  assert.equal(match('data[0/1].json', 'data0.json'), true)
  assert.equal(match('data[0/1].json', 'data1.json'), true)
  assert.equal(match('data[0/1].json', 'data2.json'), false)
  assert.equal(match('data[0/1].json', 'data/.json'), false)
  assert.equal(match('data[0/1].json', 'data0/x.json'), false)
  assert.equal(match('logs/202[0-9]/[0-9][0-9].log', 'logs/2024/07.log'), true)
  assert.equal(match('logs/202[0-9]/[0-9][0-9].log', 'logs/2024/7.log'), false)
})
