// Sub-problem 5: webhook.deliver resolves through the policy - the caller's
// requested value is honoured, the ceiling caps it, zero is an error, and an
// override replaces both the default and the floor.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/index.js'

const event = (id) => ({ id, kind: 'invoice.paid' })

test('a webhook delivery honours the caller\'s requested timeout', () => {
  const app = createApp()
  assert.equal(app.webhooks.deliver(event('evt-1'), { timeout: 12000 }).timeoutMs, 12000)
})

test('a webhook delivery above the hard ceiling is capped at the ceiling', () => {
  const app = createApp()
  assert.equal(app.webhooks.deliver(event('evt-2'), { timeout: 45000 }).timeoutMs, 30000)
})

test('a requested delivery timeout of zero is rejected', () => {
  const app = createApp()
  assert.throws(() => app.webhooks.deliver(event('evt-3'), { timeout: 0 }), RangeError)
})

test('a delivery override replaces the default and the floor', () => {
  const app = createApp({ timeouts: { overrides: { 'webhook.deliver': 15000 } } })
  assert.equal(app.webhooks.deliver(event('evt-4')).timeoutMs, 15000)
  assert.equal(app.webhooks.deliver(event('evt-5'), { timeout: 2000 }).timeoutMs, 15000)
})

test('a webhook delivery with no requested timeout gets the documented default', () => {
  const app = createApp()
  const plan = app.webhooks.deliver(event('evt-6'))
  assert.equal(plan.timeoutMs, 10000)
  assert.equal(plan.attempts, 3)
  assert.deepEqual(plan.event, event('evt-6'))
})
