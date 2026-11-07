// Sub-problem 1: the token itself - the two ways it is aborted, the boundary a
// deadline shares with the clock, and the checkpoints a cancelled run walks.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPipeline, createToken, createDeadlineToken, linkTokens, createClock } from '../src/index.js'

test('an abort before the run starts does no work and blames the ingress', async () => {
  const caller = createToken()
  caller.abort('client-hung-up')
  let calls = 0
  const pipeline = createPipeline({
    upstream: async () => {
      calls += 1
      return { ok: true }
    },
  })
  const result = await pipeline.run({ apiKey: 'k-1', tenant: 'acme', token: caller })
  assert.equal(result.status, 'cancelled')
  assert.equal(result.stage, 'ingress')
  assert.equal(result.reason, 'client-hung-up')
  assert.equal(result.response, null)
  assert.deepEqual(result.stages, ['record', 'cleanup'])
  assert.equal(calls, 0)
})

test('a token keeps the first reason it was given, and an abort with no argument cannot erase it', () => {
  const caller = createToken()
  assert.equal(caller.aborted, false)
  assert.equal(caller.reason, null)
  caller.abort()
  assert.equal(caller.reason, 'aborted')
  caller.abort('second')
  caller.abort()
  assert.equal(caller.aborted, true)
  assert.equal(caller.reason, 'aborted')
})

test('a deadline that has passed cancels at the ingress, before any stage runs', async () => {
  const clock = createClock(1000)
  let calls = 0
  const pipeline = createPipeline({
    clock,
    upstream: async () => {
      calls += 1
      return { ok: true }
    },
  })
  const result = await pipeline.run({
    apiKey: 'k-1',
    tenant: 'acme',
    token: createDeadlineToken(1000, clock),
  })
  assert.equal(result.status, 'cancelled')
  assert.equal(result.stage, 'ingress')
  assert.equal(result.reason, 'deadline')
  assert.deepEqual(result.stages, ['record', 'cleanup'])
  assert.equal(calls, 0)
  assert.equal(pipeline.services.audit.last().reason, 'deadline')
})

test('a deadline that lapses while the upstream is answering stops the run there', async () => {
  const clock = createClock(0)
  let calls = 0
  const pipeline = createPipeline({
    clock,
    upstream: async () => {
      calls += 1
      clock.set(1000)
      return { ok: true }
    },
  })
  const result = await pipeline.run({
    apiKey: 'k-1',
    tenant: 'acme',
    token: createDeadlineToken(1000, clock),
  })
  assert.equal(result.status, 'cancelled')
  assert.equal(result.stage, 'upstream')
  assert.equal(result.reason, 'deadline')
  assert.equal(result.committed, false)
  assert.equal(calls, 1)
})

test('of two linked sources the first one to abort supplies the reason', async () => {
  const clock = createClock(0)
  const caller = createToken()
  const linked = linkTokens(caller, createDeadlineToken(500, clock))
  assert.equal(linked.aborted, false)

  const pipeline = createPipeline({
    clock,
    upstream: async () => {
      clock.set(500)
      return { ok: true }
    },
  })
  const result = await pipeline.run({ apiKey: 'k-1', token: linked })
  assert.equal(result.reason, 'deadline')
  assert.equal(caller.aborted, false)
})
