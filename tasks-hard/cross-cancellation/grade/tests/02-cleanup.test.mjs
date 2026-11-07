// Sub-problem 2: what a cancelled request gives back - the rate-limit slot it
// spent and the job it queued - and what a completed one must store.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPipeline, createToken, createCache, createRateLimiter } from '../src/index.js'

test('the slot a cancelled request took is spendable again', async () => {
  const caller = createToken()
  const limiter = createRateLimiter({ capacity: 1 })
  const pipeline = createPipeline({
    limiter,
    upstream: async () => {
      caller.abort('client-hung-up')
      return { ok: true }
    },
  })

  const cancelled = await pipeline.run({ apiKey: 'k-1', tenant: 'acme', token: caller })
  assert.equal(cancelled.status, 'cancelled')

  const next = await pipeline.run({ apiKey: 'k-1', tenant: 'acme' })
  assert.equal(next.status, 'completed')
})

test('two cancelled requests leave the limiter with nothing held', async () => {
  const limiter = createRateLimiter({ capacity: 2 })
  const one = createToken()
  const two = createToken()
  const pipeline = createPipeline({
    limiter,
    upstream: async ({ signal }) => {
      signal.abort('client-hung-up')
      return { ok: true }
    },
  })
  const key = 'k-1:/v1/charge'

  const first = await pipeline.run({ apiKey: 'k-1', tenant: 'acme', route: '/v1/charge', token: one })
  const second = await pipeline.run({ apiKey: 'k-1', tenant: 'acme', route: '/v1/charge', token: two })
  assert.equal(first.status, 'cancelled')
  assert.equal(second.status, 'cancelled')
  assert.equal(limiter.held(key), 0)
})

test('a run that completes stores its answer under the key it reserved', async () => {
  const cache = createCache()
  const pipeline = createPipeline({ cache, upstream: async () => ({ ok: true, value: 7 }) })
  const key = 'acme|/v1/quote|{}'

  const result = await pipeline.run({ apiKey: 'k-1', tenant: 'acme', route: '/v1/quote' })
  assert.equal(result.status, 'completed')
  assert.equal(cache.has(key), true)
  assert.deepEqual(cache.peek(key), { ok: true, value: 7 })
  assert.equal(cache.reserved(key), false)
})

test('a cancelled request does not destroy the value another request stored', async () => {
  const caller = createToken()
  const cache = createCache()
  const key = 'globex|/v1/charge|{}'
  let calls = 0

  const pipeline = createPipeline({
    cache,
    upstream: async () => {
      calls += 1
      return { charged: true }
    },
  })

  const stored = await pipeline.run({ apiKey: 'k-1', tenant: 'globex', route: '/v1/charge', ref: 'req-a' })
  assert.equal(stored.status, 'completed')

  // The same key is being looked up again when the caller gives up. Whatever
  // the request was holding when it stopped, the answer already stored under
  // the key is not it.
  const result = await pipeline.run({
    apiKey: 'k-1',
    tenant: 'globex',
    route: '/v1/charge',
    ref: 'req-b',
    token: caller,
    onStage: (name) => {
      if (name === 'auth') caller.abort('client-hung-up')
    },
  })

  assert.equal(result.committed, false)
  assert.equal(result.response, null)
  assert.equal(cache.has(key), true)
  assert.deepEqual(cache.peek(key), { charged: true })
  assert.equal(calls, 1)
})
