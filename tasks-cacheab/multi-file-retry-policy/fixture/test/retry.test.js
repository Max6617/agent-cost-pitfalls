import test from 'node:test'
import assert from 'node:assert/strict'
import { parseConfig, defaultConfig } from '../src/config.js'
import { classify, statusOf, isRateLimited } from '../src/classify.js'
import { schedule, delayFor, rateLimitDelay, hostGap } from '../src/backoff.js'
import { Worker } from '../src/worker.js'
import { fail } from '../src/util.js'

const config = defaultConfig()

/** Build a worker whose `attempt` fails `failures.length` times, then succeeds. */
function workerFor(failures, overrides = {}) {
  const waits = []
  let calls = 0
  const worker = new Worker({
    config: { ...config, ...overrides },
    attempt: async () => {
      const next = failures[calls++]
      if (next) throw next
      return { calls }
    },
    sleep: async (ms) => { waits.push(ms) },
  })
  return { worker, waits, calls: () => calls }
}

test('the shipped policy validates', () => {
  const parsed = parseConfig({ attempts: 3 })
  assert.equal(parsed.ok, true)
  assert.equal(parsed.config.attempts, 3)
  assert.equal(parsed.config.baseDelayMs, config.baseDelayMs)
})

test('a policy with a negative delay is rejected by name', () => {
  const parsed = parseConfig({ baseDelayMs: -1 })
  assert.equal(parsed.ok, false)
  assert.deepEqual(parsed.errors, ['baseDelayMs must be a non-negative number'])
})

test('a policy whose base exceeds the cap is rejected', () => {
  const parsed = parseConfig({ baseDelayMs: 9000, maxDelayMs: 100 })
  assert.equal(parsed.ok, false)
  assert.ok(parsed.errors.some((e) => /must not exceed maxDelayMs/.test(e)))
})

test('a numeric status is read as itself', () => {
  assert.equal(statusOf(fail(429)), 429)
  assert.equal(statusOf({ code: '503' }), 503)
  assert.equal(statusOf({ code: 404 }), 404)
})

test('a symbolic code is normalised to its status', () => {
  assert.equal(statusOf({ code: 'RATE_LIMITED' }), 429)
  assert.equal(statusOf({ code: 'bad_gateway' }), 502)
  assert.equal(statusOf({ code: 'per-host-limit' }), 429)
})

test('an unrecognisable failure has no status', () => {
  assert.equal(statusOf(new Error('socket hang up')), null)
  assert.equal(statusOf({ code: 'TEAPOT' }), null)
})

test('a rate limit is classified as retryable however it is spelled', () => {
  assert.equal(classify(fail(429)).kind, 'retry')
  assert.equal(classify({ code: 'RATE_LIMITED' }).kind, 'retry')
  assert.equal(classify({ code: 'per-host-limit' }).kind, 'retry')
})

test('a client error is fatal and is never retried', () => {
  assert.equal(classify(fail(400)).kind, 'fatal')
  assert.equal(classify(fail(422)).kind, 'fatal')
  assert.equal(classify({ code: 'UNAUTHORIZED' }).kind, 'fatal')
})

test('a server error is retryable and keeps its status', () => {
  const verdict = classify(fail(503, 'upstream busy'))
  assert.equal(verdict.kind, 'retry')
  assert.equal(verdict.status, 503)
})

test('a rate limit is distinguishable from a plain server error', () => {
  assert.equal(isRateLimited(fail(429)), true)
  assert.equal(isRateLimited({ code: 'RATE_LIMITED' }), true)
  assert.equal(isRateLimited(fail(500)), false)
})

test('the schedule doubles from the base and stops at the cap', () => {
  assert.deepEqual(schedule({ attempts: 4, baseDelayMs: 250, maxDelayMs: 8000 }), [250, 500, 1000, 2000])
  assert.deepEqual(schedule({ attempts: 6, baseDelayMs: 250, maxDelayMs: 1500 }), [250, 500, 1000, 1500, 1500, 1500])
})

test('the delay for a given attempt comes from the schedule', () => {
  assert.equal(delayFor(config, 0), 250)
  assert.equal(delayFor(config, 2), 1000)
  assert.equal(delayFor(config, 99), config.maxDelayMs)
})

test('a rate limit backs off on the schedule, never below one second', () => {
  assert.equal(rateLimitDelay(config, 0), 1000)
  assert.equal(rateLimitDelay(config, 1), 1000)
  assert.equal(rateLimitDelay(config, 2), 1000)
  assert.equal(rateLimitDelay(config, 3), 2000)
  const patient = { ...config, baseDelayMs: 3000 }
  assert.equal(rateLimitDelay(patient, 1), 6000)
})

test('a rate limit never waits less than the per-host gap', () => {
  const slow = { ...config, perHostMinGapMs: 3000 }
  assert.equal(hostGap(slow, 0), 3000)
  assert.equal(hostGap(slow, 1500), 1500)
})

test('the per-host gap is a floor on call spacing', () => {
  assert.equal(hostGap(config, 0), 1000)
  assert.equal(hostGap(config, 400), 600)
  assert.equal(hostGap(config, 1000), 0)
  assert.equal(hostGap(config, 5000), 0)
})

test('a Retry-After header is honoured when the upstream sends one', () => {
  assert.equal(rateLimitDelay(config, 0, 5000), 5000)
  assert.equal(rateLimitDelay(config, 0, 100), 1000)
})

test('a job that succeeds first time is not delayed', async () => {
  const { worker, waits } = workerFor([])
  const result = await worker.run({})
  assert.equal(result.ok, true)
  assert.equal(result.attempts, 1)
  assert.deepEqual(waits, [])
})

test('a transient failure is retried on the schedule', async () => {
  const { worker, waits } = workerFor([fail(500), fail(503)])
  const result = await worker.run({})
  assert.equal(result.ok, true)
  assert.equal(result.attempts, 3)
  assert.deepEqual(waits, [250, 500])
})

test('the worker waits out a rate limit before retrying', async () => {
  const { worker, waits, calls } = workerFor([fail(429), fail(429)])
  const result = await worker.run({})
  assert.equal(result.ok, true)
  assert.deepEqual(waits, [1000, 1000])
  assert.equal(calls(), 3)
})

test('a fatal client error gives up without waiting', async () => {
  const { worker, waits, calls } = workerFor([fail(400), fail(400), fail(400)])
  const result = await worker.run({})
  assert.equal(result.ok, false)
  assert.equal(result.fatal, true)
  assert.deepEqual(waits, [])
  assert.equal(calls(), 1)
})

test('a symbolic fatal code also gives up immediately', async () => {
  const { worker, waits } = workerFor([{ code: 'UNAUTHORIZED' }])
  const result = await worker.run({})
  assert.equal(result.fatal, true)
  assert.deepEqual(waits, [])
})

test('the worker stops after the configured number of attempts', async () => {
  const { worker, waits, calls } = workerFor([fail(500), fail(500), fail(500), fail(500)], { attempts: 4 })
  const result = await worker.run({})
  assert.equal(result.ok, false)
  assert.equal(result.fatal, false)
  assert.equal(calls(), 4)
  assert.deepEqual(waits, [250, 500, 1000])
})

test('a one-attempt policy does not retry at all', async () => {
  const { worker, waits, calls } = workerFor([fail(500)], { attempts: 1 })
  const result = await worker.run({})
  assert.equal(result.ok, false)
  assert.deepEqual(waits, [])
  assert.equal(calls(), 1)
})
