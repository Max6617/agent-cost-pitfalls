import test from 'node:test'
import assert from 'node:assert/strict'
import { match } from '../src/index.js'

test('a leading dot needs a dot in the pattern', () => {
  assert.equal(match('*', '.env'), false)
  assert.equal(match('*', '.env', { dot: true }), true)
  assert.equal(match('*.js', 'app.js'), true)
})

test('a trailing slash means a directory', () => {
  assert.equal(match('backup/', 'backup/'), true)
  assert.equal(match('backup/', 'backup'), false)
  assert.equal(match('backup/', 'backup/notes.txt'), false)
})
