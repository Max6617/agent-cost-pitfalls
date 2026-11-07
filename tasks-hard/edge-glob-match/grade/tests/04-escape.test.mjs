// Sub-problem 4: escaping, on its own and inside brace alternatives.
import test from 'node:test'
import assert from 'node:assert/strict'
import { expandBraces, match } from '../src/index.js'

test('an escaped star, bracket and question mark are literal', () => {
  assert.equal(match('a\\*b', 'a*b'), true)
  assert.equal(match('a\\*b', 'axb'), false)
  assert.equal(match('a\\*b', 'a/x/b'), false)
  assert.equal(match('\\*', '*'), true)
  assert.equal(match('data\\[1\\].json', 'data[1].json'), true)
  assert.equal(match('data\\[1\\].json', 'data1.json'), false)
  assert.equal(match('v\\?.txt', 'v?.txt'), true)
  assert.equal(match('v\\?.txt', 'v1.txt'), false)
  assert.equal(match('\\?', 'x'), false)
})

test('a backslash escapes itself and a trailing backslash is literal', () => {
  assert.equal(match('dir\\', 'dir\\'), true)
  assert.equal(match('dir\\\\', 'dir\\'), true)
  assert.equal(match('dir\\\\', 'dir'), false)
  assert.equal(match('a\\\\b', 'a\\b'), true)
  assert.equal(match('dir\\', 'dir/'), false)
  assert.equal(match('backup/*\\*', 'backup/note*'), true)
  assert.equal(match('backup/*\\*', 'backup/note1'), false)
})

test('an escaped star inside a brace alternative', () => {
  assert.deepEqual(expandBraces('backup/{\\*,draft-*}'), ['backup/\\*', 'backup/draft-*'])
  assert.equal(match('backup/{\\*,draft-*}', 'backup/*'), true)
  assert.equal(match('backup/{\\*,draft-*}', 'backup/draft-07.txt'), true)
  assert.equal(match('backup/{\\*,draft-*}', 'backup/other.txt'), false)
  assert.equal(match('backup/{\\*,draft-*}', 'backup/draft-a/b'), false)
})

test('an escaped comma does not separate brace alternatives', () => {
  assert.deepEqual(expandBraces('{a\\,b,c}'), ['a\\,b', 'c'])
  assert.equal(match('{a\\,b,c}.txt', 'a,b.txt'), true)
  assert.equal(match('{a\\,b,c}.txt', 'c.txt'), true)
  assert.equal(match('{a\\,b,c}.txt', 'b.txt'), false)
  assert.equal(match('{a\\,b,c}.txt', 'a.txt'), false)
  assert.equal(match('tag{\\{x\\},y}', 'tag{x}'), true)
  assert.equal(match('tag{\\{x\\},y}', 'tag{y}'), false)
  assert.equal(match('tag{\\{x\\},y}', 'tagy'), true)
})
