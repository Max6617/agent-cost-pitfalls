// Sub-problem 3: write dependencies refuse while they are degraded, with the
// documented code, and nothing goes out on the wire.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createClock, createService, loadConfig, RESPONSES, makeTransport } from '../src/index.js'

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

const attempted = (calls, name) => calls[name].length
const tags = (res) => res.degraded.map((d) => `${d.dependency}:${d.action}`)

function byName(res) {
  const map = {}
  for (const step of res.steps) map[step.name] = step
  return map
}

test('a degraded payment provider is refused with its documented code', () => {
  const { service, calls } = scenario({ clock: createClock(0) })
  service.markDegraded('payment.charges')
  const res = service.handle({ id: 'w-2', route: 'checkout' }, { at: 0 })
  const payment = byName(res).payment

  assert.equal(attempted(calls, 'payment.charges'), 0, 'a known-down provider must not be dialled')
  assert.equal(payment.status, 'REFUSED')
  assert.equal(payment.code, 'payment-degraded')
  assert.equal(payment.ok, false)
  assert.equal(res.ok, false)
  assert.equal(res.code, 'dependency-unavailable')
  assert.equal(res.failingStep, 'payment')
  assert.deepEqual(tags(res), ['payment.charges:refused'])
  assert.equal(attempted(calls, 'store.receipts'), 0, 'no receipt is written for a payment that was refused')
  assert.equal(attempted(calls, 'email.receipts'), 0)
  assert.equal(byName(res).receipt, undefined)
  assert.equal(res.metrics.refusals, 1)
  assert.equal(res.metrics.fallbacks, 0, 'a refusal is not a fallback')
})

test('a degraded receipts store is refused, and the email is not attempted', () => {
  const { service, calls } = scenario({ clock: createClock(0) })
  service.markDegraded('store.receipts')
  const res = service.handle({ id: 'w-4', route: 'checkout' }, { at: 0 })
  const receipt = byName(res).receipt

  assert.equal(attempted(calls, 'payment.charges'), 1, 'the payment was fine and went out')
  assert.equal(attempted(calls, 'store.receipts'), 0)
  assert.equal(receipt.status, 'REFUSED')
  assert.equal(receipt.code, 'store-degraded')
  assert.equal(res.failingStep, 'receipt')
  assert.equal(res.code, 'dependency-unavailable')
  assert.equal(res.metrics.refusals, 1)
  assert.equal(res.metrics.fallbacks, 0, 'a refusal is not a fallback')
  assert.equal(attempted(calls, 'email.receipts'), 0, 'nothing after the refused step is attempted')
})

test('the second charge of one request is refused once the first one has opened the breaker', () => {
  const clock = createClock(0)
  const ref = scenario({
    clock,
    script: { 'payment.charges': { ok: false, status: 503, error: 'provider down' } },
  })

  // A route that charges the same provider twice: the first charge fails twice
  // over and opens the breaker, and the second must then be refused.
  const config = structuredClone(loadConfig())
  config.routes['charge-twice'] = {
    steps: [
      { name: 'first', dependency: 'payment.charges', required: true },
      { name: 'second', dependency: 'payment.charges', required: true },
    ],
  }
  const service = createService({ clock, transports: ref.transports, config })

  const first = service.handle({ id: 'w-8', route: 'charge-twice' }, { at: clock.at() })
  assert.equal(attempted(ref.calls, 'payment.charges'), 1)
  assert.equal(byName(first).first.status, 'FAILED', 'the call went out and the provider refused it')
  assert.equal(service.breakerState('payment.charges'), 'closed', 'one failure is not the threshold yet')

  const second = service.handle({ id: 'w-9', route: 'charge-twice' }, { at: clock.at() })
  const charges = byName(second)
  assert.equal(attempted(ref.calls, 'payment.charges'), 2, 'the first charge of the second request went out')
  assert.equal(service.breakerState('payment.charges'), 'open', 'two failures is the payment threshold')
  assert.equal(charges.second, undefined, 'the route stopped at the first charge')

  const third = service.handle({ id: 'w-10', route: 'charge-twice' }, { at: clock.at() })
  const refused = byName(third)
  assert.equal(attempted(ref.calls, 'payment.charges'), 2, 'nothing more goes to a provider whose breaker is open')
  assert.equal(refused.first.status, 'REFUSED')
  assert.equal(refused.first.code, 'payment-degraded')
  assert.equal(third.ok, false)
  assert.equal(third.code, 'dependency-unavailable')
  assert.equal(third.metrics.refusals, 1)
})
