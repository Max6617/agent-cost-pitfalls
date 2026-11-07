// Sub-problem 6: cancelling twice, cancelling after the work was committed, and
// what a cancelled run must not disturb in the run beside it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPipeline, createToken, createCache, createRateLimiter, createQueue } from '../src/index.js'

test('a second abort changes nothing observable', async () => {
  const caller = createToken()
  let during = null
  const pipeline = createPipeline({
    upstream: async () => {
      caller.abort('first')
      caller.abort('second')
      caller.abort()
      during = { aborted: caller.aborted, reason: caller.reason }
      return { ok: true }
    },
  })

  const result = await pipeline.run({ apiKey: 'k-1', tenant: 'acme', token: caller })
  assert.deepEqual(during, { aborted: true, reason: 'first' })
  assert.equal(result.status, 'cancelled')
  assert.equal(result.reason, 'first')
  const line = pipeline.services.audit.last()
  assert.equal(line.reason, 'first')
  assert.equal(line.stage, 'upstream')
})

test('two runs at once: cancelling one leaves the other untouched', async () => {
  const cache = createCache()
  const limiter = createRateLimiter({ capacity: 4 })
  const queue = createQueue()
  const doomed = createToken()
  const pipeline = createPipeline({
    cache,
    limiter,
    queue,
    upstream: async ({ request, signal }) => {
      if (request.tenant === 'acme') signal.abort('client-hung-up')
      return { ok: true, value: { tenant: request.tenant } }
    },
  })

  const [first, second] = await Promise.all([
    pipeline.run({ apiKey: 'k-1', tenant: 'acme', route: '/v1/charge', ref: 'req-a', token: doomed }),
    pipeline.run({ apiKey: 'k-2', tenant: 'globex', route: '/v1/charge', ref: 'req-b' }),
  ])

  assert.equal(first.status, 'cancelled')
  assert.equal(first.committed, false)
  assert.equal(first.response, null)
  assert.equal(second.status, 'completed')
  assert.equal(second.committed, true)
  assert.deepEqual(second.response, { ok: true, value: { tenant: 'globex' } })
  assert.equal(second.attempts, 1)
  assert.equal(cache.has('globex|/v1/charge|{}'), true)
  assert.equal(cache.has('acme|/v1/charge|{}'), false)
  assert.deepEqual(queue.pending(), [])
})

test('a cancellation after a run committed does not disturb what it committed', async () => {
  const cache = createCache()
  const limiter = createRateLimiter({ capacity: 1 })
  const queue = createQueue()
  const caller = createToken()
  const pipeline = createPipeline({
    cache,
    limiter,
    queue,
    upstream: async () => ({ ok: true, value: { charged: true } }),
  })

  const committed = await pipeline.run({ apiKey: 'k-1', tenant: 'globex', route: '/v1/charge', ref: 'req-a' })
  assert.equal(committed.status, 'completed')
  assert.deepEqual(cache.peek('globex|/v1/charge|{}'), { ok: true, value: { charged: true } })

  const after = await pipeline.run({
    apiKey: 'k-1',
    tenant: 'acme',
    route: '/v1/charge',
    token: caller,
    onStage: (name) => {
      if (name === 'limit') caller.abort('client-hung-up')
    },
  })

  assert.equal(after.status, 'cancelled')
  assert.equal(after.committed, false)
  assert.deepEqual(after.stages, ['auth', 'cache', 'limit', 'record', 'cleanup'])
  assert.deepEqual(cache.peek('globex|/v1/charge|{}'), { ok: true, value: { charged: true } })
  assert.deepEqual(queue.pending(), [])
  assert.equal(limiter.held('k-1:/v1/charge'), 0)
})

test('an already-aborted token does not leak into the run beside it', async () => {
  const dead = createToken()
  dead.abort('shutdown')
  const pipeline = createPipeline({ upstream: async () => ({ ok: true, value: 1 }) })

  const cancelled = await pipeline.run({ apiKey: 'k-1', tenant: 'acme', token: dead })
  const afterwards = await pipeline.run({ apiKey: 'k-1', tenant: 'acme' })

  assert.equal(cancelled.status, 'cancelled')
  assert.equal(cancelled.stage, 'ingress')
  assert.equal(cancelled.committed, false)
  assert.equal(afterwards.status, 'completed')
  assert.equal(afterwards.committed, true)
  assert.deepEqual(afterwards.response, { ok: true, value: 1 })
})
