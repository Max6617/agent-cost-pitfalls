import test from 'node:test'
import assert from 'node:assert/strict'
import { ResponseCache } from '../src/cache.js'
import { RequestPath } from '../src/path.js'
import { fakeClock } from '../src/clock.js'

/** A cache on a fake clock with a 1000ms ttl unless a test says otherwise. */
function makeCache(options = {}) {
  const clock = fakeClock(0)
  const cache = new ResponseCache({ maxSize: 3, ttlMs: 1000, now: clock.now, ...options })
  return { cache, clock }
}

test('a stored value comes back', () => {
  const { cache } = makeCache()
  cache.set('a', 1)
  assert.equal(cache.get('a'), 1)
})

test('a value survives right up to its ttl and not a millisecond longer', () => {
  const { cache, clock } = makeCache()
  cache.set('a', 1)
  clock.advance(999)
  assert.equal(cache.get('a'), 1)
  clock.advance(1)
  assert.equal(cache.get('a'), undefined)
})

test('an expired entry is swept and counted as an expiration', () => {
  const { cache, clock } = makeCache()
  cache.set('a', 1)
  cache.set('b', 2)
  clock.advance(1000)
  assert.equal(cache.sweep(), 2)
  assert.equal(cache.stats().expirations, 2)
  assert.equal(cache.stats().evictions, 0)
})

test('a get promotes an entry to most recently used', () => {
  const { cache } = makeCache()
  cache.set('a', 1)
  cache.set('b', 2)
  cache.set('c', 3)

  assert.equal(cache.get('a'), 1)
  cache.set('d', 4)

  assert.equal(cache.has('a'), true, 'a was used most recently and must survive')
  assert.equal(cache.has('b'), false, 'b was used least recently and must be evicted')
  assert.deepEqual([...cache.entries.keys()], ['c', 'a', 'd'])
})

test('has() does not change the recency order', () => {
  const { cache } = makeCache()
  cache.set('a', 1)
  cache.set('b', 2)
  cache.set('c', 3)

  assert.equal(cache.has('a'), true)
  cache.set('d', 4)

  assert.equal(cache.has('a'), false, 'has() must not promote')
  assert.equal(cache.has('b'), true)
})

test('the cache never grows past maxSize and reports the eviction', () => {
  const { cache } = makeCache({ maxSize: 2 })
  cache.set('a', 1)
  cache.set('b', 2)
  cache.set('c', 3)
  cache.set('d', 4)

  assert.equal(cache.size, 2)
  assert.equal(cache.stats().evictions, 2)
  assert.equal(cache.stats().expirations, 0)
})

test('expired entries do not count against maxSize', () => {
  const { cache, clock } = makeCache({ maxSize: 2 })
  cache.set('a', 1)
  cache.set('b', 2)
  clock.advance(1000)
  cache.set('c', 3)
  cache.set('d', 4)

  assert.equal(cache.size, 2)
  assert.equal(cache.has('c'), true)
  assert.equal(cache.has('d'), true)
  assert.equal(cache.stats().evictions, 0, 'nothing needed evicting: a and b had expired')
})

test('a miss is counted whether the key was absent or expired', () => {
  const { cache, clock } = makeCache()
  assert.equal(cache.get('nope'), undefined)
  cache.set('a', 1)
  clock.advance(1000)
  assert.equal(cache.get('a'), undefined)
  assert.equal(cache.stats().misses, 2)
  assert.equal(cache.stats().hits, 0)
})

test('writing an existing key refreshes its ttl and its recency', () => {
  const { cache, clock } = makeCache({ maxSize: 2 })
  cache.set('a', 1)
  cache.set('b', 2)
  clock.advance(900)
  cache.set('a', 10)

  clock.advance(200)
  assert.equal(cache.get('a'), 10, 'the rewrite restarted the ttl')
  assert.equal(cache.has('b'), false, 'b expired first')
})

test('has() reports an expired entry as absent and removes it', () => {
  const { cache, clock } = makeCache()
  cache.set('a', 1)
  clock.advance(1000)
  assert.equal(cache.has('a'), false)
  assert.equal(cache.stats().expirations, 1)
})

test('size reports live entries only', () => {
  const { cache, clock } = makeCache()
  cache.set('a', 1)
  cache.set('b', 2)
  clock.advance(1000)
  assert.equal(cache.size, 0)
})

test('a very small maxSize still holds the newest entry', () => {
  const { cache } = makeCache({ maxSize: 1 })
  cache.set('a', 1)
  cache.set('b', 2)
  assert.equal(cache.size, 1)
  assert.equal(cache.get('b'), 2)
})

test('delete removes an entry without counting an eviction', () => {
  const { cache } = makeCache()
  cache.set('a', 1)
  assert.equal(cache.delete('a'), true)
  assert.equal(cache.get('a'), undefined)
  assert.equal(cache.stats().evictions, 0)
})

test('the request path serves a repeat from the cache', () => {
  const clock = fakeClock(0)
  const path = new RequestPath({ maxSize: 4, ttlMs: 1000, now: clock.now })

  assert.equal(path.fetch('k', () => 'v1'), 'v1')
  assert.equal(path.fetch('k', () => 'v2'), 'v1')
  assert.equal(path.stats().upstreamCalls, 1)
  assert.equal(path.stats().hits, 1)
})

test('the pre-flight check does not disturb the cache', () => {
  const clock = fakeClock(0)
  const path = new RequestPath({ maxSize: 2, ttlMs: 1000, now: clock.now })

  path.fetch('a', () => 1)
  path.fetch('b', () => 2)
  assert.equal(path.isWarm('a'), true)
  path.fetch('c', () => 3)

  assert.equal(path.isWarm('a'), false, 'the pre-flight check must not keep a entry alive')
  assert.equal(path.stats().hits, 0)
  assert.equal(path.stats().evictions, 1)
})

test('an expired entry is refetched and the fetch is counted upstream', () => {
  const clock = fakeClock(0)
  const path = new RequestPath({ maxSize: 4, ttlMs: 1000, now: clock.now })

  path.fetch('k', () => 'v1')
  clock.advance(1000)
  assert.equal(path.fetch('k', () => 'v2'), 'v2')
  assert.equal(path.stats().upstreamCalls, 2)
  assert.equal(path.stats().expirations, 1)
})
