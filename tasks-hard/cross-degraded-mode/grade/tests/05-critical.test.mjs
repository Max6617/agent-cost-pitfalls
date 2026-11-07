// Sub-problem 5: a critical dependency fails the whole request fast, before
// anything is attempted on its behalf or after it.
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

test('a critical dependency fails the request before anything after it runs', () => {
  const { service, calls } = scenario({ clock: createClock(0) })
  service.markDegraded('pricing.quotes')
  const res = service.handle({ id: 'c-1', route: 'checkout' }, { at: 0 })

  assert.equal(res.ok, false)
  assert.equal(res.code, 'critical-dependency-degraded')
  assert.equal(res.failingDependency, 'pricing.quotes')
  assert.deepEqual(tags(res), ['pricing.quotes:failed'])
  assert.equal(res.degraded[0].class, 'critical')
  assert.equal(res.metrics.failFast, 1)
  assert.equal(attempted(calls, 'pricing.quotes'), 0, 'a critical dependency is not probed by a request')
  assert.equal(attempted(calls, 'payment.charges'), 0, 'and nothing is charged for a request that cannot be priced')
  assert.equal(attempted(calls, 'store.receipts'), 0)
  assert.equal(byName(res).payment, undefined, 'the route stopped at the quote step')
  assert.deepEqual(res.steps.map((s) => s.name), ['account', 'transactions', 'cart', 'catalog', 'features'])
})

test('a critical dependency whose breaker opened fails the request too', () => {
  const clock = createClock(0)
  const { service, calls } = scenario({
    clock,
    // The pricing service fails out of its own breaker: two failed calls is its
    // threshold.
    script: { 'pricing.quotes': [RESPONSES.error('pricing down'), RESPONSES.error('pricing down'), RESPONSES.ok({ quote: 3 })] },
  })

  service.handle({ id: 'c-5', route: 'checkout' }, { at: clock.at() })
  service.handle({ id: 'c-6', route: 'checkout' }, { at: clock.at() })
  assert.equal(service.breakerState('pricing.quotes'), 'open', 'two failures is the pricing threshold')
  assert.equal(attempted(calls, 'pricing.quotes'), 2)

  const res = service.handle({ id: 'c-7', route: 'checkout' }, { at: clock.at() })
  assert.equal(res.ok, false)
  assert.equal(res.code, 'critical-dependency-degraded')
  assert.equal(res.failingDependency, 'pricing.quotes')
  assert.equal(attempted(calls, 'pricing.quotes'), 2, 'an open breaker means the request does not even try')
  assert.equal(res.metrics.failFast, 1)
})

test('any dependency of the critical class fails the route fast, not just the first one', () => {
  const clock = createClock(0)
  const ref = scenario({ clock })

  // A route in which the payment provider is the critical dependency: the
  // policy is about the class, not about one particular service.
  const config = structuredClone(loadConfig())
  config.dependencies['payment.charges'].class = 'critical'
  config.routes.upgrade = {
    steps: [
      { name: 'account', dependency: 'db.primary', required: true },
      { name: 'charge', dependency: 'payment.charges', required: true },
      { name: 'receipt', dependency: 'store.receipts', required: true },
    ],
  }
  const service = createService({ clock, transports: ref.transports, config })
  service.markDegraded('payment.charges')

  const res = service.handle({ id: 'c-8', route: 'upgrade' }, { at: clock.at() })

  assert.equal(res.ok, false)
  assert.equal(res.code, 'critical-dependency-degraded')
  assert.equal(res.failingDependency, 'payment.charges')
  assert.equal(attempted(ref.calls, 'payment.charges'), 0)
  assert.equal(attempted(ref.calls, 'store.receipts'), 0, 'nothing after a critical dependency is attempted')
  assert.equal(byName(res).account.status, 'OK', 'and the steps before it did run')
  assert.equal(res.metrics.failFast, 1)
  assert.deepEqual(res.degraded.map((d) => d.dependency), ['payment.charges'])
  assert.equal(res.degraded[0].class, 'critical', 'the report carries the class the registry gives the dependency')
})
