import test from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/index.js'

test('an http request above the hard ceiling is capped at the ceiling', () => {
  const app = createApp()
  assert.equal(app.http.fetch('/reports/nightly', { timeout: 45000 }).timeoutMs, 30000)
})

test('an http request below the default is raised to the default', () => {
  const app = createApp()
  assert.equal(app.http.fetch('/health', { timeout: 100 }).timeoutMs, 2000)
})

test('a query with no requested timeout gets the documented default', () => {
  const app = createApp()
  assert.equal(app.db.query('select 1').timeoutMs, 1000)
})

test('a requested query timeout of zero is an error, not "wait forever"', () => {
  const app = createApp()
  assert.throws(() => app.db.query('select 1', [], { timeout: 0 }), RangeError)
})

test('a queue override applies to the operation it names', () => {
  const app = createApp({ timeouts: { overrides: { 'queue.poll': 8000 } } })
  assert.equal(app.queue.poll().timeoutMs, 8000)
})

test('a queue poll above the hard ceiling is capped at the ceiling', () => {
  const app = createApp()
  assert.equal(app.queue.poll({ timeout: 60000 }).timeoutMs, 30000)
})

test('a cache read below the default is raised to the default', () => {
  const app = createApp()
  assert.equal(app.cache.get('session:42', { timeout: 100 }).timeoutMs, 250)
})

test('a cache read with no requested timeout gets the documented default', () => {
  const app = createApp()
  assert.equal(app.cache.get('session:42').timeoutMs, 250)
})

test('a webhook delivery honours the caller\'s requested timeout', () => {
  const app = createApp()
  assert.equal(app.webhooks.deliver({ id: 'evt-1', kind: 'invoice.paid' }, { timeout: 12000 }).timeoutMs, 12000)
})

test('a webhook delivery with no requested timeout gets the documented default', () => {
  const app = createApp()
  assert.equal(app.webhooks.deliver({ id: 'evt-2', kind: 'invoice.voided' }).timeoutMs, 10000)
})
