// Sub-problem 4: the retry and timeout wrappers - cancellation outranks both a
// retry and a timeout, and a run that is cancelled stops making attempts.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPipeline, createToken, createClock, TimeoutError } from '../src/index.js'

test('cancelling during an attempt stops the retries: no second attempt starts', async () => {
  const caller = createToken()
  let calls = 0
  const pipeline = createPipeline({
    config: { retry: { maxAttempts: 3, backoffMs: 10 } },
    upstream: async ({ signal }) => {
      calls += 1
      signal.abort('client-hung-up')
      throw new Error('attempt failed')
    },
  })

  const result = await pipeline.run({ apiKey: 'k-1', tenant: 'acme', token: caller })
  assert.equal(result.status, 'cancelled')
  assert.equal(calls, 1)
  assert.equal(result.stage, 'upstream')
  assert.equal(pipeline.services.audit.last().reason, 'client-hung-up')
})

test('cancelling while the backoff is running does not produce another attempt', async () => {
  const caller = createToken()
  let calls = 0
  const pipeline = createPipeline({
    config: { retry: { maxAttempts: 4, backoffMs: 50 } },
    sleep: async (ms) => {
      if (ms === 50) caller.abort('client-hung-up')
    },
    upstream: async () => {
      calls += 1
      throw new Error('attempt failed')
    },
  })

  const result = await pipeline.run({ apiKey: 'k-1', tenant: 'acme', token: caller })
  assert.equal(result.status, 'cancelled')
  assert.equal(calls, 1)
  assert.equal(result.attempts, 1)
  assert.equal(result.reason, 'client-hung-up')
  assert.equal(result.committed, false)
  assert.equal(pipeline.services.audit.last().stage, 'upstream')
})

test('the caller giving up outranks the timeout it outlived', async () => {
  const caller = createToken()
  const clock = createClock(0)
  let calls = 0
  const pipeline = createPipeline({
    clock,
    config: { timeoutMs: 100, retry: { maxAttempts: 1, backoffMs: 1 } },
    upstream: async () => {
      calls += 1
      clock.set(1000)
      caller.abort('client-hung-up')
      return { ok: true, value: { charged: true } }
    },
  })

  const result = await pipeline.run({ apiKey: 'k-1', tenant: 'acme', token: caller })
  assert.equal(result.status, 'cancelled')
  assert.equal(result.reason, 'client-hung-up')
  assert.equal(result.stage, 'upstream')
  assert.equal(calls, 1)
})

test('a token aborted while the slot was held means the upstream is never called', async () => {
  const caller = createToken()
  let calls = 0
  const pipeline = createPipeline({
    config: { retry: { maxAttempts: 2, backoffMs: 10 } },
    upstream: async () => {
      calls += 1
      return { ok: true }
    },
  })

  const result = await pipeline.run({
    apiKey: 'k-1',
    tenant: 'acme',
    token: caller,
    onStage: (name) => {
      if (name === 'limit') caller.abort('client-hung-up')
    },
  })
  assert.equal(result.status, 'cancelled')
  assert.equal(calls, 0)
  assert.equal(result.attempts, 0)
  assert.deepEqual(result.stages, ['auth', 'cache', 'limit', 'record', 'cleanup'])
  assert.equal(pipeline.services.audit.last().stage, 'limit')
})
