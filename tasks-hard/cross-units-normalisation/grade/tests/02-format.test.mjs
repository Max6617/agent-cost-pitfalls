// Sub-problem 2: writing a value back out, and the round trip through both.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CONFIG_URL,
  createService,
  formatDuration,
  formatSize,
  loadConfig,
  parseDuration,
  parseSize,
} from '../src/index.js'

const raw = JSON.parse(readFileSync(CONFIG_URL, 'utf8'))

test('a duration is written with the largest unit that divides it exactly', () => {
  assert.equal(formatDuration(0), '0ms')
  assert.equal(formatDuration(1), '1ms')
  assert.equal(formatDuration(250), '250ms')
  assert.equal(formatDuration(1000), '1s')
  assert.equal(formatDuration(1500), '1.5s')
  assert.equal(formatDuration(60000), '1m')
  assert.equal(formatDuration(90000), '1.5m')
  assert.equal(formatDuration(3600000), '1h')
  assert.equal(formatDuration(5400000), '1.5h')
  assert.equal(formatDuration(86400000), '24h')
})

test('writing a duration and reading it back returns the same duration', () => {
  for (const ms of [0, 1, 250, 999, 1000, 1500, 2500, 60000, 90000, 3600000, 5400000, 86400000]) {
    assert.equal(parseDuration(formatDuration(ms)), ms, 'round trip of ' + ms)
  }
  assert.equal(formatDuration(parseDuration('1.50s')), '1.5s')
  assert.equal(formatDuration(parseDuration(' 90 s ')), '1.5m')
  assert.equal(formatDuration(parseDuration('2000ms')), '2s')
  assert.equal(formatDuration(parseDuration('0.4ms')), '1ms')
})

test('a size is written in binary units and reads back to the same size', () => {
  assert.equal(formatSize(1), '1b')
  assert.equal(formatSize(512), '512b')
  assert.equal(formatSize(1024), '1kb')
  assert.equal(formatSize(1536), '1.5kb')
  assert.equal(formatSize(8192), '8kb')
  assert.equal(formatSize(2097152), '2mb')
  assert.equal(formatSize(1073741824), '1gb')
  for (const bytes of [1, 512, 1024, 1536, 4096, 8192, 2097152, 1073741824]) {
    assert.equal(parseSize(formatSize(bytes)), bytes, 'round trip of ' + bytes)
  }
})

test('every duration and size on the whole surface round-trips through the writer', () => {
  const config = loadConfig()
  const service = createService()

  // each pair is [what the service holds, what the config file wrote]
  const surface = [
    [service.client.timeoutMs, raw.client.timeout],
    [service.retry.baseBackoffMs, raw.retry.baseBackoff],
    [service.retry.maxBackoffMs, raw.retry.maxBackoff],
    [service.retry.budgetMs, raw.retry.budget],
    [service.cache.ttlMs, raw.cache.ttl],
    [service.limiter.windowMs, raw.limiter.window],
    [service.log.slowMs, raw.log.slow],
    [service.scheduler.tickMs, raw.scheduler.tick],
    [config.cache.ttlMs, raw.cache.ttl],
  ]
  for (const [value, written] of surface) {
    assert.equal(value, parseDuration(written), written + ' reaches the service unchanged')
    assert.equal(parseDuration(formatDuration(value)), value, formatDuration(value) + ' reads back')
    assert.equal(formatDuration(parseDuration(written)), formatDuration(value), written + ' normalises')
  }

  for (const bound of service.metrics.bucketsMs) {
    assert.equal(parseDuration(formatDuration(bound)), bound, 'bucket ' + bound + ' reads back')
  }
  assert.equal(service.log.maxRecordBytes, parseSize(raw.log.maxRecord))
  assert.equal(parseSize(formatSize(service.log.maxRecordBytes)), service.log.maxRecordBytes)

  // one written value, three modules: the TTL, the slow threshold and a bucket
  // bound are the same text in the file, so they are the same number here
  const shared = parseDuration(raw.cache.ttl)
  assert.equal(parseDuration(raw.log.slow), shared)
  assert.equal(service.cache.ttlMs, shared)
  assert.equal(service.log.slowMs, shared)
  assert.ok(service.metrics.bucketsMs.includes(shared), 'the bucket written as ' + raw.cache.ttl + ' is ' + shared)

  // reading a value that was already text and writing it again does not move it
  for (const text of ['1.50s', ' 30 s ', '2000ms', '1.5 m', '0.4ms', '24h', '1.0001s', '0.999s']) {
    const once = formatDuration(parseDuration(text))
    assert.equal(formatDuration(parseDuration(once)), once, 'normalising ' + text + ' is stable')
  }
})
