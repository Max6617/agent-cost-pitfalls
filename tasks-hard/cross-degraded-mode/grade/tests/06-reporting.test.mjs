// Sub-problem 6: the response and the counters. What each call site decided has
// to be visible - which tier served, what was refused, what was skipped - and
// the four responses to degradation are counted separately.
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

test('the response reports which tier served, per step and for the request', () => {
  const { service } = scenario({ clock: createClock(0) })
  service.markDegraded('db.primary')
  const res = service.handle({ id: 'r-1', route: 'checkout' }, { at: 0 })
  const account = byName(res).account

  assert.equal(account.source, 'db.replica')
  assert.equal(account.viaFallback, true)
  assert.equal(account.degraded[0].name, 'db.primary')
  assert.equal(account.degraded[0].action, 'fallback')
  assert.deepEqual(res.degraded, [{ dependency: 'db.primary', class: 'read', action: 'fallback' }])
  assert.equal(res.ok, true)
  assert.equal(res.requestId, 'r-1')
  assert.equal(res.route, 'checkout')
  assert.equal(res.failingStep, undefined)
})

test('the response reports the refusal code and the step that could not be served', () => {
  const { service } = scenario({ clock: createClock(0) })
  service.markDegraded('store.receipts')
  const res = service.handle({ id: 'r-2', route: 'checkout' }, { at: 0 })

  assert.equal(res.ok, false)
  assert.equal(res.code, 'dependency-unavailable')
  assert.equal(res.failingStep, 'receipt')
  assert.equal(byName(res).receipt.code, 'store-degraded')
  assert.deepEqual(res.degraded, [{ dependency: 'store.receipts', class: 'write', action: 'refused' }])
})

test('the counters separate a fallback from a refusal', () => {
  const { service, calls } = scenario({ clock: createClock(0) })
  service.markDegraded('db.primary')
  service.markDegraded('payment.charges')
  const res = service.handle({ id: 'r-3', route: 'checkout' }, { at: 0 })

  assert.equal(res.metrics.fallbacks, 1)
  assert.equal(res.metrics.refusals, 1, 'a refusal is not a fallback and not an attempt')
  assert.equal(res.metrics.skipped, 0)
  assert.equal(res.metrics.callsAttempted, 6)
  assert.equal(attempted(calls, 'db.primary'), 0)
  assert.equal(attempted(calls, 'payment.charges'), 0)
  assert.equal(res.metrics.byDependency['db.primary'].fallbacks, 1, 'the counters are per dependency too')
  assert.equal(res.metrics.byDependency['db.primary'].callsAttempted, 0)
  assert.equal(res.metrics.byDependency['payment.charges'].refusals, 1, 'the provider was never called, so it has no attempts')
  assert.equal(res.metrics.bySource['db.replica'], 2, 'the replica served the account step and its own')
  assert.equal(res.metrics.bySource['payment.charges'], undefined)
})

test('the counters separate a skip from both, and count the calls that did happen', () => {
  const { service } = scenario({ clock: createClock(0) })
  service.markDegraded('email.receipts')
  service.markDegraded('search.index')
  const res = service.handle({ id: 'r-4', route: 'checkout' }, { at: 0 })

  assert.equal(res.metrics.skipped, 1)
  assert.equal(res.metrics.refusals, 0)
  assert.equal(res.metrics.fallbacks, 0, 'the catalog chain had nowhere to go: that is an empty read, not a fallback')
  assert.equal(res.metrics.callsAttempted, 8, 'seven calls, one of them to the tier that actually served the read')
  assert.equal(res.metrics.byDependency['email.receipts'].skipped, 1, 'the skip is attributed to the mailer')
  assert.equal(res.metrics.bySource['search.index'], undefined, 'nothing was ever sent to the search index')
  assert.equal(res.metrics.requests, 1)
  assert.equal(res.metrics.failFast, 0)
  assert.equal(byName(res).catalog.empty, true)
  assert.equal(res.ok, true)
})

test('a dependency that recovers mid-request is used by the steps that follow', () => {
  const clock = createClock(0)
  const transports = {}
  const calls = {}
  for (const name of DEPENDENCIES) {
    const transport = makeTransport(RESPONSES.ok({ name }), name)
    transports[name] = transport
    calls[name] = transport.calls
  }

  // The replica transport stands in for the on-call engineer clearing the mark
  // while the request is in flight: the first step has already missed it.
  let service = null
  const replica = transports['db.replica']
  const hooked = (payload) => {
    service.markHealthy('db.primary')
    return replica(payload)
  }
  hooked.calls = replica.calls
  transports['db.replica'] = hooked

  const config = structuredClone(loadConfig())
  config.routes.audit = {
    steps: [
      { name: 'accounting', dependency: 'db.primary', required: true },
      { name: 'ledger', dependency: 'db.primary', required: true },
    ],
  }
  service = createService({ clock, transports, config })
  service.markDegraded('db.primary')

  const res = service.handle({ id: 'r-6', route: 'audit' }, { at: 0 })
  const accounting = byName(res).accounting
  const ledger = byName(res).ledger

  assert.equal(accounting.status, 'FALLBACK', 'the first step ran while the primary was still marked')
  assert.equal(accounting.source, 'db.replica')
  assert.equal(ledger.status, 'OK', 'the second step, after the recovery, does not fall back any more')
  assert.equal(ledger.source, 'db.primary')
  assert.equal(calls['db.primary'].length, 1, 'nothing went to the primary before the mark was cleared')
  assert.equal(res.ok, true)
  assert.deepEqual(tags(res), ['db.primary:fallback'], 'the request still reports what it ran into')
})
