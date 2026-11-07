// Sub-problem 5: the audit record - a cancelled run is accounted for, it says
// which stage stopped, and it is written for every run, including the ones that
// never got anywhere.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPipeline, createToken } from '../src/index.js'

test('a cancelled run is recorded with its cause and the stage that stopped it', async () => {
  const caller = createToken()
  const pipeline = createPipeline({
    upstream: async () => {
      caller.abort('client-hung-up')
      return { ok: true }
    },
  })

  await pipeline.run({ apiKey: 'k-1', tenant: 'acme', token: caller })
  const line = pipeline.services.audit.last()
  assert.equal(line.kind, 'cancelled')
  assert.equal(line.reason, 'client-hung-up')
  assert.equal(line.stage, 'upstream')
})

test('a run cancelled at the ingress still gets its line', async () => {
  const caller = createToken()
  caller.abort('client-hung-up')
  const pipeline = createPipeline({ upstream: async () => ({ ok: true }) })

  const result = await pipeline.run({ apiKey: 'k-1', tenant: 'acme', token: caller })
  const line = pipeline.services.audit.last()
  assert.equal(result.stage, 'ingress')
  assert.equal(line.kind, 'cancelled')
  assert.equal(line.stage, 'ingress')
  assert.equal(line.reason, 'client-hung-up')
  assert.equal(pipeline.services.audit.all().length, 1)
})

test('cancelling during the wait between attempts releases the slot and the job', async () => {
  const caller = createToken()
  let openGate = null
  const gate = new Promise((resolve) => {
    openGate = resolve
  })
  const pipeline = createPipeline({
    config: { retry: { maxAttempts: 2, backoffMs: 25 } },
    sleep: () => {
      caller.abort('client-hung-up')
      return gate
    },
    upstream: async () => {
      throw new Error('attempt failed')
    },
  })

  const running = pipeline.run({ apiKey: 'k-1', tenant: 'acme', token: caller })
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  openGate()
  const result = await running

  assert.equal(result.status, 'cancelled')
  assert.equal(result.committed, false)
  assert.equal(result.attempts, 1)
  assert.equal(pipeline.services.limiter.held('k-1:/v1/echo'), 0)
  assert.deepEqual(pipeline.services.queue.pending(), [])
  const logged = pipeline.services.audit.all()
  assert.equal(logged.length, 1)
  assert.equal(logged[0].kind, 'cancelled')
  assert.equal(logged[0].reason, 'client-hung-up')
  assert.equal(logged[0].stage, 'upstream')
})

test('a completed run records the attempts it made and no cancellation', async () => {
  const pipeline = createPipeline({ upstream: async () => ({ ok: true, value: 1 }) })
  const result = await pipeline.run({ apiKey: 'k-1', tenant: 'acme' })

  const line = pipeline.services.audit.last()
  assert.equal(line.kind, 'completed')
  assert.equal(line.calls, 1)
  assert.equal(line.reused, false)
  assert.equal(line.ref, result.ref)
  assert.deepEqual(line.response, { ok: true, value: 1 })
  assert.equal(pipeline.services.audit.ofKind('cancelled').length, 0)
  assert.equal(result.attempts, 1)
})

test('a cache hit is recorded as reused with no upstream calls', async () => {
  let calls = 0
  const pipeline = createPipeline({
    upstream: async () => {
      calls += 1
      return { ok: true, value: { charged: true } }
    },
  })
  await pipeline.run({ apiKey: 'k-1', tenant: 'acme', route: '/v1/quote' })
  const result = await pipeline.run({ apiKey: 'k-1', tenant: 'acme', route: '/v1/quote' })

  const line = pipeline.services.audit.last()
  assert.equal(result.reused, true)
  assert.equal(calls, 1)
  assert.equal(line.kind, 'completed')
  assert.equal(line.reused, true)
  assert.equal(line.calls, 0)
  assert.equal(line.response, result.response)
})
