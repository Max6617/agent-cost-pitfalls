import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createPipeline,
  createToken,
  createDeadlineToken,
  createClock,
  createAuditLog,
  Cancellation,
  TimeoutError,
} from '../src/index.js'

const flush = () => new Promise((resolve) => setImmediate(resolve))

const ok = (value) => async () => ({ ok: true, value })

test('a token is live until it is tripped, and reports the reason it was tripped with', () => {
  const token = createToken()
  assert.equal(token.aborted, false)
  assert.equal(token.reason, null)
  token.abort('shutdown')
  assert.equal(token.aborted, true)
  assert.equal(token.reason, 'shutdown')
})

test('aborting is idempotent: the first reason wins', () => {
  const token = createToken()
  token.abort('first')
  token.abort('second')
  token.abort(undefined)
  assert.equal(token.reason, 'first')
  assert.throws(() => token.rethrow(), (err) => err.name === 'Cancellation' && err.reason === 'first')
})

test('abort() with no argument still trips the token', () => {
  const token = createToken()
  token.abort()
  assert.equal(token.aborted, true)
  assert.equal(token.reason, 'aborted')
})

test('a deadline token expires at exactly its deadline', () => {
  const clock = createClock(1000)
  const deadline = createDeadlineToken(1000, clock)
  assert.equal(deadline.aborted, true)
  assert.equal(deadline.reason, 'deadline')
})

test('a run that is cancelled from the start does no work at all', async () => {
  const upstream = ok({ charged: true })
  const pipeline = createPipeline({ token: createToken().abort('caller-gone'), upstream })
  const result = await pipeline.run({ apiKey: 'k-1', tenant: 'acme' })
  assert.equal(result.status, 'cancelled')
  assert.equal(result.cancelled, true)
  assert.equal(result.stage, 'ingress')
  assert.equal(result.reason, 'caller-gone')
  assert.equal(result.committed, false)
  assert.deepEqual(result.stages, ['record', 'cleanup'])
  assert.equal(pipeline.services.queue.pending().length, 0)
})

test('a completed run reports the stages it walked through', async () => {
  const pipeline = createPipeline({ upstream: ok({ charged: true }) })
  const result = await pipeline.run({ apiKey: 'k-1', tenant: 'acme' })
  assert.equal(result.status, 'completed')
  assert.equal(result.committed, true)
  assert.equal(result.attempts, 1)
  assert.deepEqual(result.stages, ['auth', 'cache', 'limit', 'queue', 'upstream', 'record', 'cleanup'])
  assert.deepEqual(result.response, { ok: true, value: { charged: true } })
})

test('a token tripped while the upstream is answering cancels the run', async () => {
  const token = createToken()
  const pipeline = createPipeline({
    upstream: async () => {
      token.abort('client-hung-up')
      return { ok: true, value: { charged: true } }
    },
  })
  const result = await pipeline.run({ apiKey: 'k-1', token })
  assert.equal(result.status, 'cancelled')
  assert.equal(result.stage, 'upstream')
  assert.equal(result.reason, 'client-hung-up')
  assert.equal(result.committed, false)
  assert.equal(result.response, null)
})

test('a cancelled run still writes its audit line', async () => {
  const token = createToken()
  const pipeline = createPipeline({
    upstream: async () => {
      token.abort('client-hung-up')
      return { ok: true }
    },
  })
  await pipeline.run({ apiKey: 'k-1', token })
  assert.equal(pipeline.services.audit.all().length, 1)
  assert.equal(pipeline.services.audit.last().kind, 'cancelled')
})

test('a cancelled request gives its rate-limit slot back', async () => {
  const token = createToken()
  const pipeline = createPipeline({
    upstream: async () => {
      token.abort('client-hung-up')
      return { ok: true }
    },
  })
  const run = pipeline.run({ apiKey: 'k-1', tenant: 'acme', token })
  await run
  const after = pipeline.run({ apiKey: 'k-1', tenant: 'acme' })
  const result = await after
  assert.equal(result.status, 'completed')
})

test('a cancelled request leaves no job waiting in the queue', async () => {
  const token = createToken()
  const pipeline = createPipeline({
    upstream: async () => {
      token.abort('client-hung-up')
      return { ok: true }
    },
  })
  await pipeline.run({ apiKey: 'k-1', token })
  assert.deepEqual(pipeline.services.queue.pending(), [])
})

test('a deadline that has already passed cancels the run before the upstream is called', async () => {
  const clock = createClock(5000)
  let calls = 0
  const pipeline = createPipeline({
    clock,
    upstream: async () => {
      calls += 1
      return { ok: true }
    },
  })
  const result = await pipeline.run({ apiKey: 'k-1', deadline: createDeadlineToken(5000, clock) })
  assert.equal(result.status, 'cancelled')
  assert.equal(result.reason, 'deadline')
  assert.equal(calls, 0)
})

test('a cancelled request does not throw away the entry it was looking up', async () => {
  const token = createToken()
  const pipeline = createPipeline({
    upstream: async () => {
      token.abort('client-hung-up')
      return { ok: true, value: { charged: true } }
    },
  })
  const key = 'acme|/v1/charge|{}'
  pipeline.services.cache.put(key, { charged: true })
  await pipeline.run({ apiKey: 'k-1', tenant: 'acme', route: '/v1/charge', token })
  assert.deepEqual(pipeline.services.cache.peek(key), { charged: true })
})

test('a cache hit ends the run without a slot, a job or an upstream call', async () => {
  let calls = 0
  const pipeline = createPipeline({
    upstream: async () => {
      calls += 1
      return { ok: true, value: { n: calls } }
    },
  })
  await pipeline.run({ apiKey: 'k-1', tenant: 'acme', route: '/v1/quote' })
  const jobsAfterFirst = pipeline.services.queue.pending().length
  const result = await pipeline.run({ apiKey: 'k-1', tenant: 'acme', route: '/v1/quote' })
  assert.equal(result.reused, true)
  assert.equal(result.attempts, 0)
  assert.equal(calls, 1)
  assert.equal(pipeline.services.queue.pending().length, jobsAfterFirst)
})

test('an upstream failure rejects instead of resolving as a cancelled run', async () => {
  const pipeline = createPipeline({
    config: { retry: { maxAttempts: 1, backoffMs: 1 } },
    upstream: async () => {
      throw new Error('connection reset')
    },
  })
  await assert.rejects(
    () => pipeline.run({ apiKey: 'k-1' }),
    (err) => err.name === 'UpstreamError' && err.kind === 'upstream',
  )
})

test('a denied request rejects and records the denial', async () => {
  const pipeline = createPipeline({ upstream: ok(null) })
  await assert.rejects(() => pipeline.run({ route: '/v1/echo' }), (err) => err.name === 'DeniedError')
  assert.equal(pipeline.services.audit.last().kind, 'denied')
})

test('a timeout rejects with TimeoutError when nothing cancelled the run', async () => {
  const clock = createClock(0)
  const pipeline = createPipeline({
    clock,
    config: { timeoutMs: 1000, retry: { maxAttempts: 1, backoffMs: 1 } },
    sleep: async (ms) => {
      clock.advance(ms)
    },
    upstream: async () => {
      await flush()
      return { ok: true }
    },
  })
  await assert.rejects(() => pipeline.run({ apiKey: 'k-1' }), (err) => err instanceof TimeoutError)
})
