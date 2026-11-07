// Sub-problem 5: the metrics histogram and the slow-log threshold, and the
// whole-second numbers the two of them publish.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CONFIG_URL, Cache, Histogram, LogWriter, createService, parseDuration } from '../src/index.js'

const raw = JSON.parse(readFileSync(CONFIG_URL, 'utf8'))

test('a histogram with no observations is empty', () => {
  const histogram = new Histogram({ bucketsMs: [250, 1000] })
  const snapshot = histogram.snapshot()
  assert.equal(snapshot.count, 0)
  assert.equal(snapshot.sumMs, 0)
  assert.deepEqual(snapshot.buckets.map((bucket) => bucket.leMs), [250, 1000])
  assert.deepEqual(snapshot.buckets.map((bucket) => bucket.count), [0, 0])
})

test('an observation is compared in milliseconds and counted in every bound above it', () => {
  const histogram = new Histogram({ bucketsMs: [100, 250, 1000, 2500] })
  histogram.observe(80)
  histogram.observe(250)
  histogram.observe(4000)
  const snapshot = histogram.snapshot()
  assert.equal(snapshot.count, 3)
  assert.equal(snapshot.sumMs, 4330)
  assert.deepEqual(snapshot.buckets.map((bucket) => bucket.count), [1, 2, 2, 2])

  const configured = createService().metrics
  assert.deepEqual(configured.bucketsMs, [100, 250, 1000, 2500, 10000])
  configured.observe(800)
  configured.observe(2400)
  const rows = configured.snapshot().buckets.map((bucket) => bucket.count)
  assert.deepEqual(rows, [0, 0, 1, 2, 2])
})

test('a record is slow when it reaches the threshold, and its size is counted in bytes', () => {
  const log = new LogWriter({ slowMs: 2000, maxRecordBytes: 16 })
  const fast = log.write({ path: '/orders' }, 1999)
  assert.equal(fast.slow, false)
  assert.equal(fast.bytes, 18)
  assert.equal(fast.tooLarge, true)
  assert.equal(fast.line, '{"path":"/orders"}')
  assert.equal(log.write({ path: '/orders' }, 2000).slow, true)

  const wide = log.write({ path: '/café' }, 10)
  assert.equal(wide.line.length, 16)
  assert.equal(wide.bytes, 17)
  assert.equal(wide.tooLarge, true)
  assert.equal(new LogWriter({ maxRecordBytes: 17 }).write({ path: '/café' }, 10).tooLarge, false)
  assert.equal(log.stats().written, 3)
  assert.equal(log.stats().slow, 1)
})

test('a lifetime publishes up and a threshold publishes down, at the same boundary', () => {
  const service = createService()
  const ttlMs = parseDuration(raw.cache.ttl)
  const slowMs = parseDuration(raw.log.slow)

  // the same configured value, read through the service and published in the two
  // opposite directions
  assert.equal(service.cache.ttlMs, ttlMs)
  assert.equal(service.log.slowMs, slowMs)
  assert.equal(service.cache.stats().ttlSeconds, Math.ceil(ttlMs / 1000))
  assert.equal(service.log.stats().slowSeconds, Math.floor(slowMs / 1000))
  assert.notEqual(service.cache.stats().ttlSeconds, service.log.stats().slowSeconds)

  assert.equal(new Cache({ ttlMs: 1400 }).stats().ttlSeconds, 2)
  assert.equal(new Cache({ ttlMs: 1000 }).stats().ttlSeconds, 1)
  assert.equal(new Cache({ ttlMs: 1001 }).stats().ttlSeconds, 2)
  assert.equal(new Cache({ ttlMs: 300000 }).stats().ttlSeconds, 300)
  assert.equal(new LogWriter({ slowMs: 2500 }).stats().slowSeconds, 2)
  assert.equal(new LogWriter({ slowMs: 1999 }).stats().slowSeconds, 1)
  assert.equal(new LogWriter({ slowMs: 2000 }).stats().slowSeconds, 2)
})
