// Sub-problem 2: '**' as a whole segment, in every position.
import test from 'node:test'
import assert from 'node:assert/strict'
import { match } from '../src/index.js'

test('a double star in the middle matches zero, one and many segments', () => {
  assert.equal(match('a/**/b', 'a/b'), true)
  assert.equal(match('a/**/b', 'a/x/b'), true)
  assert.equal(match('a/**/b', 'a/x/y/b'), true)
  assert.equal(match('a/**/b', 'a/x/y/z/b'), true)
  assert.equal(match('a/**/b', 'a/xb'), false)
  assert.equal(match('a/**/b', 'b'), false)
  assert.equal(match('src/**/test/*.js', 'src/test/a.js'), true)
  assert.equal(match('src/**/test/*.js', 'src/a/b/test/c.js'), true)
  assert.equal(match('src/**/test/*.js', 'src/test/sub/a.js'), false)
  assert.equal(match('pkg/*/lib/**', 'pkg/a/lib/x/y.js'), true)
})

test('a leading double star may match no directory at all', () => {
  assert.equal(match('**/*.js', 'main.js'), true)
  assert.equal(match('**/*.js', 'src/main.js'), true)
  assert.equal(match('**/*.js', 'src/lib/main.js'), true)
  assert.equal(match('**/*.js', 'main.txt'), false)
  assert.equal(match('**/config.json', 'config.json'), true)
  assert.equal(match('**/config.json', 'a/b/config.json'), true)
  assert.equal(match('a/**/*.js', 'a/main.js'), true)
  assert.equal(match('a/**/*.js', 'a/b/main.js'), true)
})

test('a trailing double star covers the directory and everything below it', () => {
  assert.equal(match('src/**', 'src/'), true)
  assert.equal(match('src/**', 'src/app.js'), true)
  assert.equal(match('src/**', 'src/lib/app.js'), true)
  assert.equal(match('src/**', 'src/lib/'), true)
  assert.equal(match('src/**', 'src'), false)
  assert.equal(match('src/**', 'other/app.js'), false)
  assert.equal(match('src/**/', 'src/'), true)
  assert.equal(match('src/**/', 'src/lib/'), true)
  assert.equal(match('src/**/', 'src/lib/app.js'), false)
})

test('a bare double star matches every path, and **/ matches directories', () => {
  assert.equal(match('**', 'app.js'), true)
  assert.equal(match('**', 'src/app.js'), true)
  assert.equal(match('**', 'src/'), true)
  assert.equal(match('**', 'src/lib/'), true)
  assert.equal(match('**/', 'src/'), true)
  assert.equal(match('**/', 'src/lib/'), true)
  assert.equal(match('**/', 'src'), false)
  assert.equal(match('**/', 'src/app.js'), false)
})
