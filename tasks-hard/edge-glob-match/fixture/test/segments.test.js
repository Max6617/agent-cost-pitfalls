import test from 'node:test'
import assert from 'node:assert/strict'
import { match } from '../src/index.js'

test('a star matches any name inside one segment', () => {
  assert.equal(match('*.js', 'app.js'), true)
  assert.equal(match('*.js', 'app.txt'), false)
  assert.equal(match('backup/*', 'backup/notes.txt'), true)
  assert.equal(match('backup/*', 'backup/drafts/notes.txt'), false)
})

test('a question mark matches exactly one character', () => {
  assert.equal(match('log?.txt', 'log1.txt'), true)
  assert.equal(match('log?.txt', 'log.txt'), false)
  assert.equal(match('a?b', 'axb'), true)
})
