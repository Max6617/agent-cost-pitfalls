// Sub-problem 3: the HTTP client and the retry policy, and the budget that the
// two of them share.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  HttpClient,
  RetryPolicy,
  createService,
  parseDuration,
} from '../src/index.js'

test('the client compares the response time against the configured timeout', () => {
  const client = new HttpClient({ timeoutMs: 1500, baseUrl: 'https://planner.internal' })
  assert.equal(client.attempt({ path: '/orders', responseMs: 1200 }).status, 'ok')
  assert.equal(client.attempt({ path: '/orders', responseMs: 1500 }).status, 'ok')
  assert.equal(client.attempt({ path: '/orders', responseMs: 1501 }).status, 'timeout')
  const quick = new HttpClient({ timeoutMs: 40 })
  assert.equal(quick.attempt({ responseMs: 40 }).status, 'ok')
  assert.equal(quick.attempt({ responseMs: 41 }).status, 'timeout')
})

test('the retry backoff starts at the base and stops at the cap', () => {
  const retry = new RetryPolicy({ attempts: 4, baseBackoffMs: 250, maxBackoffMs: 2000, budgetMs: 30000 })
  assert.equal(retry.backoffMs(0), 0)
  assert.equal(retry.backoffMs(1), 250)
  assert.equal(retry.backoffMs(2), 500)
  assert.equal(retry.backoffMs(3), 1000)
  assert.equal(retry.backoffMs(4), 2000)
  assert.equal(retry.backoffMs(5), 2000)
  assert.equal(retry.backoffMs(9), 2000)
})

test('the retry budget pays for the waits between the attempts as well', () => {
  const retry = new RetryPolicy({ attempts: 5, baseBackoffMs: 250, maxBackoffMs: 2000, budgetMs: 24000 })

  // 8000, then 250 + 8000, then 500 + 8000: three attempts would need 24750.
  const plan = retry.schedule({ perAttemptTimeoutMs: 8000 })
  assert.equal(plan.allowed, true)
  assert.equal(plan.attempts, 2)
  assert.equal(plan.totalMs, 16250)
  assert.equal(plan.reason, 'ok')
  assert.ok(plan.totalMs + 500 + 8000 > 24000, 'one attempt more would not have fitted in the budget')

  const tight = retry.schedule({ perAttemptTimeoutMs: 8000, spentMs: 16000 })
  assert.equal(tight.allowed, true)
  assert.equal(tight.attempts, 1)
  assert.equal(tight.totalMs, 8000)

  const spent = retry.schedule({ perAttemptTimeoutMs: 8000, spentMs: 16251 })
  assert.equal(spent.allowed, false)
  assert.equal(spent.attempts, 0)
  assert.equal(spent.totalMs, 0)
  assert.equal(spent.reason, 'budget')

  // the configured attempt count still caps a budget that could afford more
  const cheap = retry.schedule({ perAttemptTimeoutMs: 1 })
  assert.equal(cheap.attempts, 5)
  assert.ok(cheap.totalMs < 24000)
})

test('the configured timeout and budget reach the policy, and a sub-millisecond timeout is not zero', () => {
  const service = createService()
  assert.equal(service.client.timeoutMs, 1500)
  assert.equal(service.retry.budgetMs, 24000)
  const plan = service.retry.schedule({ perAttemptTimeoutMs: service.client.timeoutMs })
  assert.equal(plan.allowed, true)
  assert.equal(plan.attempts, 4)
  assert.equal(plan.totalMs, 7750)
  assert.equal(service.retry.schedule({ perAttemptTimeoutMs: 40000 }).allowed, false)

  const tiny = new HttpClient({ timeoutMs: parseDuration('0.4ms') })
  assert.equal(tiny.timeoutMs, 1)
  assert.equal(tiny.attempt({ path: '/ping', responseMs: 1 }).status, 'ok')
  assert.equal(tiny.attempt({ path: '/ping', responseMs: 2 }).status, 'timeout')
})
