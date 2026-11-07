// Sub-problem 1: http.fetch resolves through the policy - the floor raises a
// small request, the hard ceiling caps a large one, zero is an error, and an
// override on the operation is honoured.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/index.js'

test('an http request below the default is raised to the default', () => {
  const app = createApp()
  assert.equal(app.http.fetch('/health', { timeout: 100 }).timeoutMs, 2000)
})

test('an http request above the hard ceiling is capped at the ceiling', () => {
  const app = createApp()
  assert.equal(app.http.fetch('/reports/nightly', { timeout: 45000 }).timeoutMs, 30000)
})

test('a requested http timeout of zero is rejected', () => {
  const app = createApp()
  assert.throws(() => app.http.fetch('/health', { timeout: 0 }), RangeError)
})

test('an http override applies, and the ceiling still caps a request above it', () => {
  const app = createApp({ timeouts: { overrides: { 'http.fetch': 8000 } } })
  // the override replaces the default when nothing is requested
  assert.equal(app.http.fetch('/health').timeoutMs, 8000)
  // and a request above the ceiling is still capped at the ceiling, not the override
  assert.equal(app.http.fetch('/reports/nightly', { timeout: 45000 }).timeoutMs, 30000)
})

test('an http request with no requested timeout gets the documented default', () => {
  const app = createApp()
  const plan = app.http.fetch('/health')
  assert.equal(plan.timeoutMs, 2000)
  assert.equal(plan.url, 'http://internal/health')
  assert.equal(plan.method, 'GET')
})
