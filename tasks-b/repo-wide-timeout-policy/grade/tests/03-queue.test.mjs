// Sub-problem 3: queue.poll and queue.publish resolve their own operation
// names, so per-operation overrides actually reach them - including overrides
// that act as a floor, overrides capped at build time, and overrides on both
// operations at once.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/index.js'

test('a poll override applies to the operation it names', () => {
  const app = createApp({ timeouts: { overrides: { 'queue.poll': 8000 } } })
  assert.equal(app.queue.poll().timeoutMs, 8000)
})

test('a poll override is the floor a small request is raised to', () => {
  const app = createApp({ timeouts: { overrides: { 'queue.poll': 8000 } } })
  assert.equal(app.queue.poll({ timeout: 2000 }).timeoutMs, 8000)
})

test('an override above the ceiling is capped when the policy is built', () => {
  const app = createApp({ timeouts: { overrides: { 'queue.poll': 45000 } } })
  assert.equal(app.queue.poll().timeoutMs, 30000)
})

test('poll and publish take their overrides independently', () => {
  const app = createApp({ timeouts: { overrides: { 'queue.poll': 8000, 'queue.publish': 3000 } } })
  assert.equal(app.queue.publish({ kind: 'reindex' }).timeoutMs, 3000)
  assert.equal(app.queue.poll().timeoutMs, 8000)
})

test('a queue poll above the hard ceiling is capped at the ceiling', () => {
  const app = createApp()
  app.queue.publish({ kind: 'reindex' })
  app.queue.publish({ kind: 'resize' })
  const plan = app.queue.poll({ timeout: 60000 })
  assert.equal(plan.timeoutMs, 30000)
  assert.deepEqual(plan.messages, [{ kind: 'reindex' }, { kind: 'resize' }])
})
