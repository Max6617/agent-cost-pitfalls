// Sub-problem 4: cache.get and cache.set resolve through the policy - a small
// request is raised to the floor, a huge one is capped at the ceiling, zero is
// an error, and an override names one operation only.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/index.js'

test('a cache read below the default is raised to the default', () => {
  const app = createApp()
  assert.equal(app.cache.get('session:42', { timeout: 100 }).timeoutMs, 250)
})

test('a cache write above the hard ceiling is capped at the ceiling', () => {
  const app = createApp()
  assert.equal(app.cache.set('session:42', 'ada', { timeout: 90000 }).timeoutMs, 30000)
})

test('a requested cache timeout of zero is rejected', () => {
  const app = createApp()
  assert.throws(() => app.cache.get('session:42', { timeout: 0 }), RangeError)
})

test('a cache read with no requested timeout gets the documented default', () => {
  const app = createApp()
  assert.equal(app.cache.get('session:42').timeoutMs, 250)
})

test('a get override raises the floor for get and leaves set alone', () => {
  const app = createApp({ timeouts: { overrides: { 'cache.get': 400 } } })
  const miss = app.cache.get('session:99', { timeout: 100 })
  assert.equal(miss.timeoutMs, 400)
  assert.equal(miss.hit, false)
  // the override names cache.get only; set keeps the class default
  assert.equal(app.cache.set('session:99', 'ada').timeoutMs, 250)
  assert.equal(app.cache.get('session:99').hit, true)
})
