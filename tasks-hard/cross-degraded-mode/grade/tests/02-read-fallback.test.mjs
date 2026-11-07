// Sub-problem 2: read-only dependencies fall back along their documented chain
// and never fail the request - whether the dependency is degraded because it was
// marked, or because its own breaker opened, or because its fallback is down too.
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

/** Fail the primary three times so its own breaker opens. */
function tripPrimary(ref) {
  for (const id of ['t-1', 't-2', 't-3']) ref.service.handle({ id, route: 'browse' }, { at: ref.clock.at() })
  assert.equal(ref.service.breakerState('db.primary'), 'open')
}

test('a degraded read dependency is served by the next tier, not called itself', () => {
  const { service, calls } = scenario({ clock: createClock(0) })
  service.markDegraded('db.primary')
  const res = service.handle({ id: 'f-1', route: 'browse' }, { at: 0 })
  const account = byName(res).account

  assert.equal(attempted(calls, 'db.primary'), 0, 'nothing goes to a dependency that is known to be down')
  assert.equal(attempted(calls, 'db.replica'), 1)
  assert.equal(account.status, 'FALLBACK')
  assert.equal(account.source, 'db.replica')
  assert.equal(account.viaFallback, true)
  assert.equal(account.empty, false)
  assert.equal(res.ok, true)
  assert.deepEqual(tags(res), ['db.primary:fallback'])
})

test('a read dependency whose breaker is open is not called either', () => {
  const ref = scenario({ clock: createClock(0), script: { 'db.primary': RESPONSES.error('primary down') } })
  tripPrimary(ref)
  const before = attempted(ref.calls, 'db.primary')

  const res = ref.service.handle({ id: 'f-2', route: 'browse' }, { at: ref.clock.at() })
  const account = byName(res).account

  assert.equal(attempted(ref.calls, 'db.primary'), before, 'an open breaker means no call, marked or not')
  assert.equal(account.source, 'db.replica')
  assert.equal(account.status, 'FALLBACK')
  assert.equal(account.empty, false)
  assert.equal(res.ok, true)
})

test('a chain that runs out answers with the documented empty result', () => {
  const { service, calls } = scenario({ clock: createClock(0) })
  service.markDegraded('db.primary')
  service.markDegraded('db.replica')
  service.markDegraded('cache.orders')
  const res = service.handle({ id: 'f-3', route: 'browse' }, { at: 0 })
  const account = byName(res).account

  assert.equal(account.empty, true, 'the caller has to be able to see that it is looking at nothing')
  assert.equal(account.source, null)
  assert.equal(account.status, 'FALLBACK')
  assert.equal(res.ok, true, 'a read never fails the request')
  assert.equal(attempted(calls, 'db.primary') + attempted(calls, 'cache.orders'), 0)
})

test('a fallback that is itself degraded walks on down the chain', () => {
  const { service, calls } = scenario({ clock: createClock(0) })
  service.markDegraded('db.primary')
  service.markDegraded('db.replica')
  const res = service.handle({ id: 'f-4', route: 'browse' }, { at: 0 })
  const account = byName(res).account

  assert.equal(attempted(calls, 'db.primary'), 0, 'the tier the step names is down')
  assert.equal(attempted(calls, 'db.replica'), 0, 'and so is its own documented fallback')
  assert.equal(attempted(calls, 'cache.orders'), 2, 'the chain carries on to the tier after that')
  assert.equal(account.source, 'cache.orders')
  assert.equal(account.viaFallback, true)
  assert.equal(res.ok, true)
  assert.deepEqual(tags(res), ['db.primary:fallback', 'db.replica:fallback'])
})

test('a step that could not be served does not stop the steps after it', () => {
  const { service, calls } = scenario({ clock: createClock(0) })
  service.markDegraded('db.primary')
  service.markDegraded('db.replica')
  service.markDegraded('cache.orders')
  service.markDegraded('search.index')
  const res = service.handle({ id: 'f-5', route: 'checkout' }, { at: 0 })

  assert.equal(res.ok, true, 'the account could not be read, and the order still goes through')
  assert.equal(byName(res).account.empty, true)
  assert.equal(byName(res).catalog.empty, true)
  assert.equal(attempted(calls, 'payment.charges'), 1)
  assert.equal(attempted(calls, 'store.receipts'), 1)
  assert.deepEqual(tags(res), [
    'db.primary:fallback',
    'db.replica:fallback',
    'cache.orders:fallback',
    'search.index:fallback',
  ])
  assert.deepEqual(res.degraded.map((d) => d.class), ['read', 'read', 'read', 'read'])
})
