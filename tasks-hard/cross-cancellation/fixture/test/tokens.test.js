import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createPipeline,
  createToken,
  createDeadlineToken,
  linkTokens,
  createClock,
  Cancellation,
} from '../src/index.js'

const run = (clock, token) =>
  createPipeline({ clock, upstream: async () => ({ ok: true }) }).run({ apiKey: 'k-1', token })

test('a token can be tripped by a handler that knows the request is gone', () => {
  const token = createToken()
  assert.equal(token.aborted, false)
  token.abort('client-hung-up')
  assert.equal(token.aborted, true)
  assert.equal(token.reason, 'client-hung-up')
})

test('a deadline token is live before its deadline', () => {
  const clock = createClock(999)
  const deadline = createDeadlineToken(1000, clock)
  assert.equal(deadline.aborted, false)
  assert.equal(deadline.reason, null)
})

test('a deadline token expires at exactly its deadline', () => {
  const clock = createClock(1000)
  const deadline = createDeadlineToken(1000, clock)
  assert.equal(deadline.aborted, true)
  assert.equal(deadline.reason, 'deadline')
})

test('a deadline token stops a run that has already started', async () => {
  const clock = createClock(0)
  const deadline = createDeadlineToken(1000, clock)
  const result = await createPipeline({
    clock,
    upstream: async () => {
      clock.set(1000)
      return { ok: true }
    },
  }).run({ apiKey: 'k-1', token: deadline })
  assert.equal(result.status, 'cancelled')
  assert.equal(result.reason, 'deadline')
  assert.equal(result.stage, 'upstream')
})

test('a linked token follows its sources and names the deadline as the reason', async () => {
  const clock = createClock(0)
  const caller = createToken()
  const linked = linkTokens(caller, createDeadlineToken(250, clock))
  assert.equal(linked.aborted, false)

  const result = await createPipeline({
    clock,
    upstream: async () => {
      clock.set(250)
      return { ok: true }
    },
  }).run({ apiKey: 'k-1', token: linked })

  assert.equal(result.status, 'cancelled')
  assert.equal(result.reason, 'deadline')
  assert.equal(caller.aborted, false)
})

test('an aborted run reports the abort as a Cancellation', async () => {
  const token = createToken()
  token.abort('shutdown')
  assert.throws(() => token.rethrow(), (err) => err instanceof Cancellation && err.reason === 'shutdown')
})
