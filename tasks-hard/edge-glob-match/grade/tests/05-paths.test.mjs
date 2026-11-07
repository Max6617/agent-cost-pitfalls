// Sub-problem 5: hidden segments and the directory marker.
import test from 'node:test'
import assert from 'node:assert/strict'
import { match } from '../src/index.js'

test('a wildcard never matches a hidden segment in the middle of a path', () => {
  assert.equal(match('backup/*', 'backup/notes.txt'), true)
  assert.equal(match('backup/*', 'backup/.env'), false)
  assert.equal(match('backup/*', 'backup/.env', { dot: true }), true)
  assert.equal(match('src/*.js', 'src/.eslintrc.js'), false)
  assert.equal(match('src/*.js', 'src/.eslintrc.js', { dot: true }), true)
  assert.equal(match('[.]env', '.env'), false)
  assert.equal(match('[.]env', '.env', { dot: true }), true)
  assert.equal(match('.*', '.env'), true)
})

test('a double star never steps into a hidden segment', () => {
  assert.equal(match('a/**/b', 'a/.x/b'), false)
  assert.equal(match('a/**/b', 'a/x/b'), true)
  assert.equal(match('**/*.js', 'a/.b.js'), false)
  assert.equal(match('**/*.js', 'a/b.js'), true)
  assert.equal(match('**/config', '.git/config'), false)
  assert.equal(match('**/.git/config', 'x/.git/config'), true)
  assert.equal(match('a/**/b', 'a/.x/b', { dot: true }), true)
  assert.equal(match('**/*.js', '.cache/app.js', { dot: true }), true)
})

test('a pattern that ends in a separator matches directories only', () => {
  assert.equal(match('backup/', 'backup/'), true)
  assert.equal(match('backup/', 'backup'), false)
  assert.equal(match('backup/', 'backup/notes.txt'), false)
  assert.equal(match('backup/', 'backup/', { dot: true }), true)
  assert.equal(match('src/lib/', 'src/lib/'), true)
  assert.equal(match('src/lib/', 'src/lib'), false)
  assert.equal(match('src/lib/', 'other/lib/'), false)
})

test('a trailing separator inside a longer pattern', () => {
  assert.equal(match('src/*/', 'src/lib/'), true)
  assert.equal(match('src/*/', 'src/lib'), false)
  assert.equal(match('src/*/', 'src/'), false)
  assert.equal(match('src/*/', 'src/a/b/'), false)
  assert.equal(match('data/*/', 'data/raw/'), true)
  assert.equal(match('data/*/', 'data/raw'), false)
  assert.equal(match('*', 'src/'), true)
})

test('a wildcard at the start does not pick up hidden entries', () => {
  assert.equal(match('*', '.env'), false)
  assert.equal(match('*', '.env', { dot: true }), true)
  assert.equal(match('*.js', '.eslintrc.js'), false)
  assert.equal(match('*.js', 'app.js'), true)
  assert.equal(match('**', '.env'), false)
  assert.equal(match('**', '.git/config'), false)
  assert.equal(match('*.js', 'app.js', { nocase: true }), true)
})
