import test from 'node:test'
import assert from 'node:assert/strict'
import { HttpClient, RetryPolicy, Cache } from '../src/index.js'

test('a response slower than the timeout is a timeout', () => {
  const client = new HttpClient({ timeoutMs: 1500 })
  assert.equal(client.attempt({ path: '/orders', responseMs: 1200 }).status, 'ok')
  assert.equal(client.attempt({ path: '/orders', responseMs: 1500 }).status, 'ok')
  assert.equal(client.attempt({ path: '/orders', responseMs: 1800 }).status, 'timeout')
})

test('the retry budget and the per-attempt timeout are the same quantity', () => {
  const retry = new RetryPolicy({ attempts: 5, baseBackoffMs: 250, maxBackoffMs: 2000, budgetMs: 30000 })
  const plan = retry.schedule({ perAttemptTimeoutMs: 8000 })
  assert.equal(plan.allowed, true)
  assert.equal(plan.attempts, 3)
})

test('a cached entry lives for its whole TTL', () => {
  const cache = new Cache({ ttlMs: 60000 })
  cache.set('orders', ['row'], 0)
  assert.deepEqual(cache.get('orders', 59000), ['row'])
  assert.equal(cache.get('orders', 60000), undefined)
})
