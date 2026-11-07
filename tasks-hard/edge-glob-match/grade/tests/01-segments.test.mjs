// Sub-problem 1: what '*' and '?' may match, segment boundaries, and a matcher
// that gives the same answer every time it is asked.
import test from 'node:test'
import assert from 'node:assert/strict'
import { compile, match } from '../src/index.js'

test('a star matches inside one segment, and a pattern names every segment', () => {
  assert.equal(match('backup/*', 'backup/notes.txt'), true)
  assert.equal(match('backup/*', 'backup/private/key.pem'), false)
  assert.equal(match('*', 'notes.txt'), true)
  assert.equal(match('*', 'a/b'), false)
  assert.equal(match('a*b', 'ab'), true)
  assert.equal(match('a*b', 'aXb'), true)
  assert.equal(match('data/*', 'data/sub'), true)
  assert.equal(match('data/*', 'data/'), false)
  assert.equal(match('data/*', 'data'), false)
})

test('a question mark matches exactly one character and never a separator', () => {
  assert.equal(match('log?.txt', 'log1.txt'), true)
  assert.equal(match('log?.txt', 'log.txt'), false)
  assert.equal(match('log?.txt', 'log12.txt'), false)
  assert.equal(match('a?b', 'a/b'), false)
  assert.equal(match('a?b', 'axb'), true)
  assert.equal(match('v?', 'v'), false)
})

test('a compiled pattern answers the same question the same way', () => {
  const matcher = compile('*.js')
  assert.equal(matcher.test('app.js'), true)
  assert.equal(matcher.test('lib.js'), true)
  assert.equal(matcher.test('app.js'), true)
  assert.deepEqual(matcher.select(['app.js', 'notes.txt', 'lib.js']), ['app.js', 'lib.js'])
  assert.equal(compile('*.js').test('app.js'), true)
  assert.equal(compile('*.js', { dot: true }).test('app.js'), true)
})

test('nocase compares letters without regard to case', () => {
  assert.equal(match('README.md', 'readme.md', { nocase: true }), true)
  assert.equal(match('readme.md', 'README.md', { nocase: true }), true)
  assert.equal(match('README.md', 'readme.md'), false)
  assert.equal(match('SRC/*.JS', 'src/app.js', { nocase: true }), true)
  assert.equal(match('[A-Z]OG', 'dog', { nocase: true }), true)
  assert.equal(match('[A-Z]OG', 'dog'), false)
})
