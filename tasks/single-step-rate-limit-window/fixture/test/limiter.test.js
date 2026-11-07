import test from 'node:test'
import assert from 'node:assert/strict'
import { RateLimiter } from '../src/limiter.js'

/** A limiter on a fake clock. */
function make(limit = 2, windowMs = 1000) {
  let t = 0
  const limiter = new RateLimiter({ limit, windowMs, now: () => t })
  return { limiter, advance: (ms) => (t += ms) }
}

test('calls under the limit are allowed', () => {
  const { limiter } = make()
  assert.equal(limiter.take().allowed, true)
  assert.equal(limiter.take().allowed, true)
})

test('the call that exceeds the limit is refused', () => {
  const { limiter } = make()
  limiter.take()
  limiter.take()
  const third = limiter.take()
  assert.equal(third.allowed, false)
  assert.equal(third.remaining, 0)
})

test('a refused call is not recorded', () => {
  const { limiter, advance } = make()
  limiter.take()
  limiter.take()
  limiter.take()
  limiter.take()
  advance(1000)
  assert.equal(limiter.count(), 0)
  assert.equal(limiter.take().allowed, true)
})

test('the window slides with the clock', () => {
  const { limiter, advance } = make()
  limiter.take()
  advance(600)
  limiter.take()
  assert.equal(limiter.take().allowed, false)

  advance(400)
  assert.equal(limiter.take().allowed, true, 'the first call has aged out')
})

test('the retry hint counts down to when the oldest call leaves', () => {
  const { limiter, advance } = make()
  limiter.take()
  limiter.take()
  assert.equal(limiter.take().retryAfterMs, 1000)
  advance(400)
  assert.equal(limiter.take().retryAfterMs, 600)
})

test('the remaining count falls as calls are made', () => {
  const { limiter } = make(3)
  assert.equal(limiter.take().remaining, 2)
  assert.equal(limiter.take().remaining, 1)
  assert.equal(limiter.take().remaining, 0)
})

test('a call exactly one window old has aged out', () => {
  const { limiter, advance } = make(1)
  limiter.take()
  advance(1000)
  assert.equal(limiter.take().allowed, true)
})

test('a call just inside the window has not aged out', () => {
  const { limiter, advance } = make(1)
  limiter.take()
  advance(999)
  assert.equal(limiter.take().allowed, false)
})

test('reset forgets everything', () => {
  const { limiter } = make(1)
  limiter.take()
  limiter.reset()
  assert.equal(limiter.count(), 0)
  assert.equal(limiter.take().allowed, true)
})

test('a limit of zero refuses everything', () => {
  const { limiter } = make(0)
  assert.equal(limiter.take().allowed, false)
  assert.equal(limiter.take().remaining, 0)
})
