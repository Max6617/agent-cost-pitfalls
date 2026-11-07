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

test('an account read falls back to the replica when the primary is degraded', () => {
  const { service, calls } = scenario({ clock: createClock(0) })
  service.markDegraded('db.primary')
  const res = service.handle({ id: 'v-1', route: 'browse' }, { at: 0 })

  assert.equal(calls['db.primary'].length, 0)
  assert.equal(calls['db.replica'].length, 1)
  assert.equal(byName(res).account.source, 'db.replica')
  assert.equal(byName(res).account.status, 'FALLBACK')
  assert.equal(res.ok, true)
})

test('a payment is refused, not attempted, while the provider is degraded', () => {
  const { service, calls } = scenario({ clock: createClock(0) })
  service.markDegraded('payment.charges')
  const res = service.handle({ id: 'v-3', route: 'checkout' }, { at: 0 })

  assert.equal(calls['payment.charges'].length, 0)
  assert.equal(byName(res).payment.status, 'REFUSED')
  assert.equal(byName(res).payment.code, 'payment-degraded')
  assert.equal(res.ok, false)
})
