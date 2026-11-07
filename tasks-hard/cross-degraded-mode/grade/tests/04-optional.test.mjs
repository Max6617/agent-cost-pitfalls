// Sub-problem 4: optional dependencies are skipped while they are degraded, and
// the skip is recorded instead of being attempted.
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

const attempted = (calls, name) => calls[name].length
const tags = (res) => res.degraded.map((d) => `${d.dependency}:${d.action}`)

function byName(res) {
  const map = {}
  for (const step of res.steps) map[step.name] = step
  return map
}

test('an optional call site is skipped rather than refused', () => {
  const { service } = scenario({ clock: createClock(0) })
  service.markDegraded('email.receipts')
  const res = service.handle({ id: 'o-2', route: 'checkout' }, { at: 0 })

  assert.equal(res.metrics.skipped, 1)
  assert.equal(res.metrics.refusals, 0, 'the emailer is optional: it is skipped, not refused')
  assert.equal(res.metrics.failFast, 0)
  assert.equal(res.code, 'OK')
  assert.equal(res.failingStep, undefined)
})

test('the metrics sink is skipped while it is degraded', () => {
  const { service, calls } = scenario({ clock: createClock(0) })
  service.markDegraded('metrics.sink')
  const res = service.handle({ id: 'o-3', route: 'refund' }, { at: 0 })
  const telemetry = byName(res).telemetry

  assert.equal(attempted(calls, 'metrics.sink'), 0)
  assert.equal(telemetry.status, 'SKIPPED')
  assert.equal(byName(res).payment.status, 'OK')
  assert.equal(attempted(calls, 'payment.charges'), 1, 'a silent metrics sink does not stop the order')
  assert.deepEqual(tags(res), ['metrics.sink:skipped'])
})

test('an optional call site is attempted as soon as the dependency is healthy again', () => {
  const { service, calls } = scenario({ clock: createClock(0) })
  service.markDegraded('email.receipts')
  const skipped = service.handle({ id: 'o-4', route: 'checkout' }, { at: 0 })
  assert.equal(byName(skipped).notify.status, 'SKIPPED')

  service.markHealthy('email.receipts')
  const sent = service.handle({ id: 'o-5', route: 'checkout' }, { at: 0 })
  assert.equal(attempted(calls, 'email.receipts'), 1)
  assert.equal(byName(sent).notify.status, 'OK')
  assert.equal(sent.metrics.requests, 2)
  assert.deepEqual(tags(sent), [])
})
