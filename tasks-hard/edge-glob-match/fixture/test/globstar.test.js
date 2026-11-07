import test from 'node:test'
import assert from 'node:assert/strict'
import { match } from '../src/index.js'

test('a double star spans directories', () => {
  assert.equal(match('**/*.js', 'src/lib/app.js'), true)
  assert.equal(match('**/*.js', 'app.js'), true)
})

test('a double star at the end covers what is under a directory', () => {
  assert.equal(match('src/**', 'src/app.js'), true)
  assert.equal(match('src/**/app.js', 'src/lib/app.js'), true)
})
