import test from 'node:test'
import assert from 'node:assert/strict'
import { Histogram, createService, renderReport } from '../src/index.js'

test('an unused histogram is empty', () => {
  const snapshot = new Histogram({ bucketsMs: [250, 1000] }).snapshot()
  assert.equal(snapshot.count, 0)
  assert.equal(snapshot.sumMs, 0)
  assert.deepEqual(snapshot.buckets, [
    { leMs: 250, count: 0 },
    { leMs: 1000, count: 0 },
  ])
})

test('an observation lands in the rows it is under', () => {
  const histogram = new Histogram({ bucketsMs: [250, 1000] })
  histogram.observe(100)
  histogram.observe(800)
  assert.equal(histogram.snapshot().sumMs, 900)
  assert.deepEqual(histogram.snapshot().buckets.map((bucket) => bucket.count), [1, 2])
})

test('the report names every operator knob once, in order', () => {
  const keys = renderReport(createService())
    .split('\n')
    .map((line) => line.split(':')[0])
  assert.deepEqual(keys, [
    'client.timeout',
    'retry.attempts',
    'retry.budget',
    'cache.ttl',
    'cache.ttlSeconds',
    'limiter.window',
    'metrics.buckets',
    'log.slow',
    'log.slowSeconds',
    'log.maxRecord',
    'scheduler.tick',
  ])
})
