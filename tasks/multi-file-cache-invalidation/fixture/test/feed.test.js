import test from 'node:test'
import assert from 'node:assert/strict'
import { FeedCache } from '../src/cache.js'
import { FeedService } from '../src/service.js'
import { loadFeed, sellable, cheapest, fingerprint } from '../src/feed.js'
import { memoryReader } from '../src/reader.js'

const ROWS = [
  { sku: 'TEA-01', price: '8.25', currency: 'USD' },
  { sku: 'MUG-04', price: '14.00', currency: 'USD' },
  { sku: 'OLD-01', price: '1.00', retired: true },
]

function clock(start = 0) {
  let t = start
  return { now: () => t, advance: (ms) => (t += ms) }
}

test('a fresh entry is served', () => {
  const time = clock()
  const cache = new FeedCache({ ttlMs: 1000, now: time.now })
  cache.set('a', 1)
  assert.equal(cache.get('a'), 1)
})

test('an entry past its ttl is gone, not returned stale', () => {
  const time = clock()
  const cache = new FeedCache({ ttlMs: 1000, now: time.now })
  cache.set('a', 1)
  time.advance(1000)
  assert.equal(cache.get('a'), undefined)
  assert.equal(cache.stats().invalidations, 1)
})

test('an invalidation bumps the generation', () => {
  const cache = new FeedCache()
  assert.equal(cache.generation, 0)
  cache.invalidate('a', 'test')
  assert.equal(cache.generation, 1)
  cache.invalidate()
  assert.equal(cache.generation, 2)
})

test('invalidating one key leaves the others alone', () => {
  const cache = new FeedCache()
  cache.set('a', 1)
  cache.set('b', 2)
  cache.invalidate('a')
  assert.equal(cache.get('a'), undefined)
  assert.equal(cache.get('b'), 2)
})

test('a value carries the generation it was computed at', () => {
  const cache = new FeedCache()
  cache.set('a', 1)
  assert.equal(cache.generationOf('a'), 0)
  cache.invalidate('a')
  cache.set('a', 2)
  assert.equal(cache.generationOf('a'), 1)
})

test('a write from an older generation is discarded', () => {
  const cache = new FeedCache()
  const stale = cache.generation
  cache.invalidate('a', 'write')
  const accepted = cache.setIfCurrent('a', 'stale-value', stale)
  assert.equal(accepted, false)
  assert.equal(cache.get('a'), undefined)
})

test('a write from the current generation is accepted', () => {
  const cache = new FeedCache()
  const current = cache.generation
  assert.equal(cache.setIfCurrent('a', 'fresh-value', current), true)
  assert.equal(cache.get('a'), 'fresh-value')
})

test('a value computed before the last invalidation is stale', () => {
  const cache = new FeedCache()
  cache.set('a', 1)
  cache.set('b', 2)
  assert.equal(cache.isStale('a'), false)

  cache.invalidate('a')
  assert.equal(cache.isStale('b'), true, 'b was computed before the invalidation too')
})

test('the loader groups rows into a feed and skips unusable ones', () => {
  const feed = loadFeed([...ROWS, null, { price: '1' }])
  assert.equal(feed.size, 3)
  assert.equal(feed.get('TEA-01').price, 8.25)
  assert.equal(feed.get('OLD-01').retired, true)
})

test('only unretired items are sellable and the cheapest is reported', () => {
  const feed = loadFeed(ROWS)
  assert.deepEqual(sellable(feed).map((i) => i.sku), ['TEA-01', 'MUG-04'])
  assert.equal(cheapest(feed).sku, 'TEA-01')
  assert.equal(fingerprint(feed), 'MUG-04|OLD-01|TEA-01')
})

test('a service read reads through once and then serves the cache', async () => {
  const time = clock()
  const reader = memoryReader(ROWS)
  const service = new FeedService({ cache: new FeedCache({ ttlMs: 1000, now: time.now }), reader })

  await service.read('default')
  await service.read('default')

  assert.equal(reader.calls, 1)
  assert.equal(service.stats().reads, 2)
  assert.equal(service.stats().loads, 1)
})

test('a service read reloads after the ttl runs out', async () => {
  const time = clock()
  const reader = memoryReader(ROWS)
  const service = new FeedService({ cache: new FeedCache({ ttlMs: 1000, now: time.now }), reader })

  await service.read('default')
  time.advance(1000)
  await service.read('default')

  assert.equal(reader.calls, 2)
})

test('a manual invalidation forces the next read to reload', async () => {
  const reader = memoryReader(ROWS)
  const service = new FeedService({ cache: new FeedCache(), reader })

  await service.read('default')
  service.invalidate('default', 'test')
  await service.read('default')

  assert.equal(reader.calls, 2)
})

test('two reads of the same key share one load', async () => {
  let release
  const gate = new Promise((resolve) => { release = resolve })
  const reader = {
    calls: 0,
    async read() {
      this.calls += 1
      await gate
      return ROWS.map((row) => ({ ...row }))
    },
  }
  const service = new FeedService({ cache: new FeedCache(), reader })

  const first = service.read('default')
  const second = service.read('default')
  release()
  const [a, b] = await Promise.all([first, second])

  assert.equal(reader.calls, 1)
  assert.equal(a, b)
})

test('a load that started before an invalidation does not resurrect it', async () => {
  let release
  const gate = new Promise((resolve) => { release = resolve })
  const reader = {
    calls: 0,
    async read() {
      this.calls += 1
      await gate
      return ROWS.map((row) => ({ ...row }))
    },
  }
  const cache = new FeedCache()
  const service = new FeedService({ cache, reader })

  const pending = service.read('default')
  service.invalidate('default', 'someone else wrote')
  release()
  await pending

  assert.equal(cache.get('default'), undefined, 'the in-flight load must not repopulate a stale entry')
})

test('a write invalidates and stores the new value', async () => {
  const reader = memoryReader(ROWS)
  const cache = new FeedCache()
  const service = new FeedService({ cache, reader })

  await service.read('default')
  await service.write('default', (feed) => {
    const next = new Map(feed)
    next.set('NEW-01', { sku: 'NEW-01', price: 2, currency: 'USD', retired: false })
    return next
  })

  assert.equal((await service.read('default')).has('NEW-01'), true)
  assert.equal(reader.calls, 1, 'a write must not force a reload')
})
