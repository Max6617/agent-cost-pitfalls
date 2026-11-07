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

test('a dependency that keeps failing stops being called', () => {
  const clock = createClock(0)
  const { service, calls } = scenario({ clock, script: { 'db.primary': RESPONSES.error('primary down') } })

  for (const id of ['r-1', 'r-2', 'r-3']) service.handle({ id, route: 'browse' }, { at: clock.at() })
  assert.equal(service.breakerState('db.primary'), 'open')

  service.handle({ id: 'r-4', route: 'browse' }, { at: clock.at() })
  assert.equal(calls['db.primary'].length, 3, 'nothing should go out while the breaker is open')
})

test('the breaker stops holding calls once the dependency looks healthy again', () => {
  const clock = createClock(0)
  const { service, calls } = scenario({
    clock,
    script: {
      'db.primary': [
        RESPONSES.error('d'), RESPONSES.error('d'), RESPONSES.error('d'),
        RESPONSES.ok({ back: true }), RESPONSES.ok({ back: true }),
      ],
    },
  })

  for (const id of ['h-1', 'h-2', 'h-3']) service.handle({ id, route: 'browse' }, { at: clock.at() })
  assert.equal(service.breakerState('db.primary'), 'open')

  clock.advance(30000)
  service.handle({ id: 'h-4', route: 'browse' }, { at: clock.at() })
  service.handle({ id: 'h-5', route: 'browse' }, { at: clock.at() })
  assert.equal(service.breakerState('db.primary'), 'closed')
  assert.equal(service.isDegraded('db.primary'), false)
  assert.equal(calls['db.primary'].length, 5)
})
