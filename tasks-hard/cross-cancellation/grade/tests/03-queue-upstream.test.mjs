// Sub-problem 3: the upstream call itself - a cancelled request must not start
// one, must not keep one it can no longer use, and must not turn a cancellation
// into an upstream failure.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPipeline, createToken, Cancellation } from '../src/index.js'

test('a run cancelled after the job was queued never calls the upstream', async () => {
  const caller = createToken()
  let calls = 0
  let sawSignal = null
  const pipeline = createPipeline({
    upstream: async ({ signal }) => {
      calls += 1
      sawSignal = signal
      return { ok: true }
    },
  })

  const result = await pipeline.run({
    apiKey: 'k-1',
    tenant: 'acme',
    token: caller,
    onStage: (name) => {
      if (name === 'queue') caller.abort('caller-gone')
    },
  })

  assert.equal(result.status, 'cancelled')
  assert.equal(result.stage, 'queue')
  assert.equal(calls, 0)
  assert.equal(result.attempts, 0)
  assert.equal(sawSignal, null)
  assert.deepEqual(pipeline.services.queue.pending(), [])
  assert.deepEqual(pipeline.services.queue.started(), [])
})

test('a cancellation out of the upstream is a cancellation, not an upstream failure', async () => {
  const caller = createToken()
  let calls = 0
  const pipeline = createPipeline({
    config: { retry: { maxAttempts: 3, backoffMs: 5 } },
    upstream: async () => {
      calls += 1
      caller.abort('client-hung-up')
      throw new Cancellation('client-hung-up')
    },
  })

  const result = await pipeline.run({ apiKey: 'k-1', tenant: 'acme', token: caller })
  assert.equal(result.status, 'cancelled')
  assert.equal(result.stage, 'upstream')
  assert.equal(result.attempts, 1)
  assert.equal(calls, 1)
  assert.deepEqual(pipeline.services.queue.pending(), [])
  assert.equal(pipeline.services.audit.ofKind('upstream').length, 0)
})

test('an upstream that reports the caller is gone ends the run without a retry', async () => {
  const caller = createToken()
  let calls = 0
  const pipeline = createPipeline({
    config: { retry: { maxAttempts: 3, backoffMs: 5 } },
    upstream: async ({ signal }) => {
      calls += 1
      signal.abort('upstream-shutdown')
      throw new Cancellation('upstream-shutdown')
    },
  })

  const result = await pipeline.run({ apiKey: 'k-1', tenant: 'acme', token: caller })
  assert.equal(result.status, 'cancelled')
  assert.equal(result.stage, 'upstream')
  assert.equal(result.reason, 'upstream-shutdown')
  assert.equal(calls, 1)
  assert.equal(result.committed, false)
})
