import test from 'node:test'
import assert from 'node:assert/strict'
import { createClock, createService, RESPONSES, makeTransport } from '../src/index.js'

const DEPENDENCIES = [
  'db.primary', 'db.replica', 'cache.orders', 'search.index', 'pricing.quotes',
  'payment.charges', 'store.receipts', 'email.receipts', 'flags.experiments', 'metrics.sink',
]

function scenario({ script = {}, clock = createClock(0) } = {}) {
  const transports = {}
  const calls = {}
  for (const name of DEPENDENCIES) {
    const entry = script[name]
    const transport = typeof entry === 'function' ? entry : makeTransport(entry ?? RESPONSES.ok({ name }), name)
    transport.calls = transport.calls ?? []
    transports[name] = transport
    calls[name] = transport.calls
  }
  return { service: createService({ clock, transports }), clock, transports, calls }
}

const byName = (res) => Object.fromEntries(res.steps.map((s) => [s.name, s]))

test('the response says which dependencies this request found degraded', () => {
  const { service } = scenario({ clock: createClock(0) })
  service.markDegraded('db.primary')
  const res = service.handle({ id: 'd-1', route: 'checkout' }, { at: 0 })

  assert.deepEqual(res.degraded, [{ dependency: 'db.primary', class: 'read', action: 'fallback' }])
  assert.equal(byName(res).account.status, 'FALLBACK')
})

test('a request that could not be served names the step that failed', () => {
  const { service } = scenario({ clock: createClock(0) })
  service.markDegraded('store.receipts')
  const res = service.handle({ id: 'd-4', route: 'checkout' }, { at: 0 })

  assert.equal(res.ok, false)
  assert.equal(res.code, 'dependency-unavailable')
  assert.equal(res.failingStep, 'receipt')
})

test('the request is counted against every dependency it needed', () => {
  const { service } = scenario({ clock: createClock(0) })
  service.markDegraded('db.primary')
  const res = service.handle({ id: 'd-5', route: 'checkout' }, { at: 0 })

  assert.equal(res.metrics.requests, 1)
  assert.equal(res.metrics.callsAttempted, 10, 'ten steps, and the account read was served by the replica instead')
  assert.equal(res.metrics.bySource['db.primary'], undefined, 'nothing reached the primary')
  assert.equal(res.metrics.bySource['db.replica'], 2)
  assert.equal(res.metrics.byDependency['db.replica'].callsAttempted, 2)
})

test('an optional call site that is skipped does not stop the order', () => {
  const { service, calls } = scenario({ clock: createClock(0) })
  service.markDegraded('email.receipts')
  service.markDegraded('payment.charges')
  const res = service.handle({ id: 'd-6', route: 'checkout' }, { at: 0 })

  assert.equal(calls['email.receipts'].length, 0)
  assert.equal(byName(res).payment.status, 'REFUSED')
  assert.equal(res.failingStep, 'payment')
  assert.equal(byName(res).notify, undefined, 'the route stopped at the refused payment')
})
