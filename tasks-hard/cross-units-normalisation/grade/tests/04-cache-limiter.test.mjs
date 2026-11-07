// Sub-problem 4: the cache TTL and the rate-limit window - two deadlines that
// have to be the same length as the config file says.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Cache, RateLimiter, createService } from '../src/index.js'

test('a cache entry lives for its TTL and is gone at exactly the TTL', () => {
  const cache = new Cache({ ttlMs: 60000 })
  cache.set('orders', ['row'], 1000)
  assert.deepEqual(cache.get('orders', 1000), ['row'])
  assert.deepEqual(cache.get('orders', 60999), ['row'])
  assert.equal(cache.get('orders', 61000), undefined)
  assert.equal(cache.has('orders', 61000), false)

  cache.set('users', 7, 0)
  assert.equal(cache.get('users', 59999), 7)
  assert.equal(cache.get('users', 60000), undefined)
})

test('the cache drops the entry it stored longest ago and publishes the TTL rounded up', () => {
  const cache = new Cache({ ttlMs: 1400, maxEntries: 2 })
  cache.set('a', 1, 0)
  cache.set('b', 2, 1)
  assert.equal(cache.stats().entries, 2)
  cache.set('c', 3, 2)
  assert.equal(cache.stats().entries, 2)
  assert.equal(cache.get('a', 2), undefined)
  assert.equal(cache.get('b', 2), 2)
  assert.equal(cache.get('c', 2), 3)

  assert.equal(cache.stats().ttlSeconds, 2)
  assert.equal(new Cache({ ttlMs: 1000 }).stats().ttlSeconds, 1)
  assert.equal(new Cache({ ttlMs: 300000 }).stats().ttlSeconds, 300)
})

test('at most `limit` requests are allowed while the window stands still', () => {
  const limiter = new RateLimiter({ limit: 3, windowMs: 1000 })
  const first = limiter.take(0)
  assert.equal(first.allowed, true)
  assert.equal(first.remaining, 2)
  assert.equal(first.resetAtMs, 1000)
  assert.equal(limiter.take(0).allowed, true)
  assert.equal(limiter.take(0).remaining, 0)
  const refused = limiter.take(0)
  assert.equal(refused.allowed, false)
  assert.equal(refused.remaining, 0)
})

test('the window rolls over at exactly the window length, whatever the config file wrote', () => {
  const limiter = new RateLimiter({ limit: 2, windowMs: 1000 })
  assert.equal(limiter.take(0).allowed, true)
  assert.equal(limiter.take(0).allowed, true)
  assert.equal(limiter.take(0).allowed, false)
  assert.equal(limiter.take(999).allowed, false)
  assert.equal(limiter.take(1000).allowed, true)
  assert.equal(limiter.take(1000).remaining, 0)

  const service = createService()
  assert.equal(service.limiter.windowMs, 60000)
  const configured = service.limiter
  for (let i = 0; i < 60; i += 1) {
    assert.equal(configured.take(0).allowed, true, 'request ' + i + ' is inside the limit')
  }
  assert.equal(configured.take(0).allowed, false)
  assert.equal(configured.take(59999).allowed, false)
  assert.equal(configured.take(60000).allowed, true)
})
