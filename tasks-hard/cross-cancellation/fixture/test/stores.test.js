import test from 'node:test'
import assert from 'node:assert/strict'
import { createCache, createRateLimiter, createQueue } from '../src/index.js'

test('a cache reservation is visible to whoever else asks for the same key', () => {
  const cache = createCache()
  const reservation = cache.begin('acme|/v1/quote|{}', 'req-1')
  assert.equal(cache.has('acme|/v1/quote|{}'), false)
  assert.equal(cache.reserved('acme|/v1/quote|{}'), true)
  assert.equal(cache.holderOf('acme|/v1/quote|{}'), 'req-1')
  assert.equal(reservation.key, 'acme|/v1/quote|{}')
})

test('settling a reservation leaves the key free without storing anything', () => {
  const cache = createCache()
  cache.begin('k', 'req-1')
  cache.settle('k')
  assert.equal(cache.reserved('k'), false)
  assert.equal(cache.has('k'), false)
})

test('a stored value survives a lookup that took a reservation', () => {
  const cache = createCache()
  cache.put('k', { answer: 42 })
  cache.begin('k', 'req-2')
  assert.deepEqual(cache.peek('k'), { answer: 42 })
})

test('the limiter hands out slots until capacity is reached', () => {
  const limiter = createRateLimiter({ capacity: 2 })
  const key = 'k-1:/v1/echo'
  assert.equal(limiter.allowed(key), true)
  const first = limiter.consume(key)
  limiter.consume(key)
  assert.equal(limiter.allowed(key), false)
  assert.equal(limiter.consume(key), null)
  first.release()
  assert.equal(limiter.allowed(key), true)
})

test('the queue hands jobs out in the order they arrived', () => {
  const queue = createQueue()
  const first = queue.submit({ ref: 'req-1', payload: { route: '/a' } })
  const second = queue.submit({ ref: 'req-2', payload: { route: '/b' } })
  assert.equal(queue.pending().length, 2)
  assert.equal(queue.dequeue().id, first)
  assert.equal(queue.dequeue().id, second)
  assert.equal(queue.dequeue(), null)
})
