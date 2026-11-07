// Sub-problem 1: reading a duration or a size out of text, and the config file
// that is the first thing to do so.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CONFIG_URL, formatDuration, loadConfig, parseDuration, parseSize } from '../src/index.js'

const raw = JSON.parse(readFileSync(CONFIG_URL, 'utf8'))

test('every documented duration form reads back as milliseconds', () => {
  assert.equal(parseDuration(250), 250)
  assert.equal(parseDuration('250'), 250)
  assert.equal(parseDuration('250ms'), 250)
  assert.equal(parseDuration('1s'), 1000)
  assert.equal(parseDuration('1.5s'), 1500)
  assert.equal(parseDuration(' 30 s '), 30000)
  assert.equal(parseDuration('1.5 m'), 90000)
  assert.equal(parseDuration('2h'), 7200000)
  assert.equal(parseDuration('24h'), 86400000)
  assert.equal(parseDuration('86400000ms'), 86400000)
  assert.equal(parseDuration(250.4), 251)
  assert.equal(parseDuration('0.4ms'), 1)
  assert.equal(parseDuration(0), 0)
  assert.equal(parseDuration('0ms'), 0)
})

test('a duration that cannot be read, or is out of range, is a RangeError', () => {
  for (const bad of ['abc', '', 's', 'ms', '1d', '1e3s', '1.5.5s', '-1s', -1, -0.5, null, undefined, NaN, Infinity, true, {}, []]) {
    assert.throws(() => parseDuration(bad), RangeError, 'expected a RangeError for ' + String(bad))
  }
  for (const tooLong of [86400001, '86400001ms', '90000s', '25h']) {
    assert.throws(() => parseDuration(tooLong), RangeError, 'expected a RangeError for ' + String(tooLong))
  }
  assert.throws(() => parseDuration('90000s'), /out of range/)
  assert.throws(() => parseDuration(86400001), /out of range/)
  assert.throws(() => parseDuration('1d'), /invalid duration/)
})

test('a size reads in binary units, rounds up, and stops at a gigabyte', () => {
  assert.equal(parseSize(512), 512)
  assert.equal(parseSize('512b'), 512)
  assert.equal(parseSize('1.5kb'), 1536)
  assert.equal(parseSize(' 4 kb '), 4096)
  assert.equal(parseSize('8kb'), 8192)
  assert.equal(parseSize('2mb'), 2097152)
  assert.equal(parseSize('1gb'), 1073741824)
  assert.equal(parseSize('1.2b'), 2)
  for (const bad of ['1tb', 'kb', -5, -0.5, null, NaN, {}]) {
    assert.throws(() => parseSize(bad), RangeError, 'expected a RangeError for ' + String(bad))
  }
  for (const tooBig of [1073741825, '2gb']) {
    assert.throws(() => parseSize(tooBig), RangeError, 'expected a RangeError for ' + String(tooBig))
  }
  assert.throws(() => parseSize('2gb'), /out of range/)
})

test('the loader and the parser agree on every form the file writes', () => {
  const config = loadConfig()

  assert.equal(config.client.baseUrl, raw.baseUrl)
  assert.equal(config.client.timeoutMs, parseDuration(raw.client.timeout))
  assert.equal(config.retry.attempts, raw.retry.attempts)
  assert.equal(config.retry.baseBackoffMs, parseDuration(raw.retry.baseBackoff))
  assert.equal(config.retry.maxBackoffMs, parseDuration(raw.retry.maxBackoff))
  assert.equal(config.retry.budgetMs, parseDuration(raw.retry.budget))
  assert.equal(config.cache.ttlMs, parseDuration(raw.cache.ttl))
  assert.equal(config.cache.maxEntries, raw.cache.maxEntries)
  assert.equal(config.limiter.limit, raw.limiter.limit)
  assert.equal(config.limiter.windowMs, parseDuration(raw.limiter.window))
  assert.deepEqual(config.metrics.bucketsMs, raw.metrics.buckets.map((bucket) => parseDuration(bucket)))
  assert.equal(config.log.slowMs, parseDuration(raw.log.slow))
  assert.equal(config.log.maxRecordBytes, parseSize(raw.log.maxRecord))
  assert.equal(config.scheduler.tickMs, parseDuration(raw.scheduler.tick))

  // the forms themselves, so that a second reader with its own idea of the
  // syntax cannot pass by agreeing with the parser on the easy ones only
  assert.equal(parseDuration(raw.client.timeout), 1500)
  assert.equal(parseDuration(raw.cache.ttl), 2500)
  assert.equal(parseDuration(raw.retry.budget), 24000)
  assert.equal(parseSize(raw.log.maxRecord), 8192)
  assert.match(raw.limiter.window, /\s/)
  assert.equal(config.limiter.windowMs, 60000)
  assert.equal(formatDuration(config.limiter.windowMs), '1m')
})
