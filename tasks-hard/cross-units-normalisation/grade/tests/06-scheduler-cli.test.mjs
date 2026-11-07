// Sub-problem 6: the scheduler's tick and the operator report that prints it all
// back, plus the planner the two of them are built on.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CONFIG_URL, Scheduler, createService, loadConfig, parseDuration, renderReport } from '../src/index.js'

const raw = JSON.parse(readFileSync(CONFIG_URL, 'utf8'))

test('the scheduler ticks every tickMs and stops before the horizon', () => {
  const scheduler = new Scheduler({ tickMs: 1000 })
  assert.deepEqual(scheduler.ticksUntil(5000), [0, 1000, 2000, 3000, 4000])
  assert.deepEqual(scheduler.ticksUntil(1000), [0])
  assert.deepEqual(scheduler.ticksUntil(0), [])
  const fast = new Scheduler({ tickMs: 250 })
  assert.deepEqual(fast.ticksUntil(1000), [0, 250, 500, 750])
  assert.equal(fast.countUntil(1000), 4)

  const service = createService()
  assert.equal(service.scheduler.tickMs, 500)
  assert.deepEqual(service.scheduler.ticksUntil(2000), [0, 500, 1000, 1500])
  assert.equal(service.scheduler.countUntil(2000), 4)
})

test('the report names every operator field once, in order', () => {
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

test('the report writes the configuration file back in the documented form', () => {
  const report = renderReport(createService())
  assert.match(report, /^client\.timeout: 1\.5s$/m)
  assert.match(report, /^retry\.attempts: 4$/m)
  assert.match(report, /^retry\.budget: 24s$/m)
  assert.match(report, /^cache\.ttl: 2\.5s$/m)
  assert.match(report, /^cache\.ttlSeconds: 3$/m)
  assert.match(report, /^limiter\.window: 1m$/m)
  assert.match(report, /^metrics\.buckets: 100ms, 250ms, 1s, 2\.5s, 10s$/m)
  assert.match(report, /^log\.slow: 2\.5s$/m)
  assert.match(report, /^log\.slowSeconds: 2$/m)
  assert.match(report, /^log\.maxRecord: 8kb$/m)
  assert.match(report, /^scheduler\.tick: 500ms$/m)
  assert.equal(report.split('\n').length, 11)
})

test('every planner is built fresh and leaves nothing behind for the next one', () => {
  const first = createService()
  first.metrics.observe(5000)
  first.cache.set('orders', ['row'], 0)
  first.log.write({ path: '/orders' }, 2500)
  first.limiter.take(0)

  const second = createService()
  assert.equal(second.metrics.snapshot().count, 0)
  assert.deepEqual(second.metrics.snapshot().buckets.map((bucket) => bucket.count), [0, 0, 0, 0, 0])
  assert.equal(second.cache.stats().entries, 0)
  assert.equal(second.log.stats().written, 0)
  assert.equal(second.log.stats().slow, 0)
  assert.equal(second.limiter.take(0).remaining, raw.limiter.limit - 1)
  assert.equal(renderReport(second), renderReport(createService()))

  // reading the configuration again gives the same canonical values, and the
  // planner that was used first has not moved them
  const again = loadConfig()
  assert.equal(again.cache.ttlMs, parseDuration(raw.cache.ttl))
  assert.equal(again.log.slowMs, parseDuration(raw.log.slow))
  assert.equal(again.metrics.bucketsMs.length, raw.metrics.buckets.length)
  assert.equal(second.cache.ttlMs, again.cache.ttlMs)
  assert.equal(second.retry.budgetMs, parseDuration(raw.retry.budget))
  assert.equal(renderReport(createService()), renderReport(second))
})
