// Sub-problem 2: db.query and db.exec resolve through the policy - the
// documented default, rejection of zero and negative requests, the floor, and
// an override that names one operation and leaves its sibling alone.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/index.js'

test('a query with no requested timeout gets the documented default', () => {
  const app = createApp()
  assert.equal(app.db.query('select 1').timeoutMs, 1000)
})

test('a requested query timeout of zero is rejected, not treated as "wait forever"', () => {
  const app = createApp()
  assert.throws(() => app.db.query('select 1', [], { timeout: 0 }), RangeError)
})

test('a negative exec timeout is rejected', () => {
  const app = createApp()
  assert.throws(() => app.db.exec('vacuum analyse', { timeout: -250 }), RangeError)
})

test('a query below the default is raised to the default', () => {
  const app = createApp()
  assert.equal(app.db.query('select 1', [], { timeout: 400 }).timeoutMs, 1000)
})

test('a query override does not leak into exec', () => {
  const app = createApp({ timeouts: { overrides: { 'db.query': 2000 } } })
  assert.equal(app.db.query('select 1').timeoutMs, 2000)
  // the override names db.query only; exec keeps the class default
  assert.equal(app.db.exec('vacuum analyse').timeoutMs, 1000)
  // and a request that lands between the class default and the override floor
  // is raised to the override for the operation it names
  assert.equal(app.db.query('select 1', [], { timeout: 1500 }).timeoutMs, 2000)
})
