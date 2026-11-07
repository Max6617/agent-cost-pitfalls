// Sub-problem 1: the breaker itself - threshold, the count in a row, the probe
// when openMs elapses, and what a probe does to the breaker.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createClock, createService, RESPONSES, makeTransport } from '../src/index.js'

const DEPENDENCIES = [
  'db.primary', 'db.replica', 'cache.orders', 'search.index', 'pricing.quotes',
  'payment.charges', 'store.receipts', 'email.receipts', 'flags.experiments', 'metrics.sink',
]

/** Every dependency wired to a healthy transport unless `script` says otherwise. */
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

test('the breaker opens at the configured threshold and stops the calls going out', () => {
  const { service, clock, calls } = scenario({ clock: createClock(0), script: { 'db.primary': RESPONSES.error('primary down') } })

  service.handle({ id: 'b-1', route: 'browse' }, { at: clock.at() })
  service.handle({ id: 'b-2', route: 'browse' }, { at: clock.at() })
  assert.equal(service.breakerState('db.primary'), 'closed')
  assert.equal(attempted(calls, 'db.primary'), 2)

  service.handle({ id: 'b-3', route: 'browse' }, { at: clock.at() })
  assert.equal(service.breakerState('db.primary'), 'open', 'the threshold is three failures, not four')

  service.handle({ id: 'b-4', route: 'browse' }, { at: clock.at() })
  service.handle({ id: 'b-5', route: 'browse' }, { at: clock.at() })
  assert.equal(attempted(calls, 'db.primary'), 3, 'an open breaker attempts nothing at all')
  assert.equal(service.isDegraded('db.primary'), true)
})

test('an open breaker does nothing until openMs has elapsed, then sends exactly one probe', () => {
  const clock = createClock(1000)
  const { service, calls } = scenario({ clock, script: { 'db.primary': RESPONSES.error('primary down') } })

  for (const id of ['p-1', 'p-2', 'p-3']) service.handle({ id, route: 'browse' }, { at: clock.at() })
  assert.equal(service.breakerState('db.primary'), 'open')

  clock.advance(29999)
  service.handle({ id: 'p-4', route: 'browse' }, { at: clock.at() })
  assert.equal(attempted(calls, 'db.primary'), 3, 'one millisecond early is still open')

  clock.advance(1)
  service.handle({ id: 'p-5', route: 'browse' }, { at: clock.at() })
  assert.equal(attempted(calls, 'db.primary'), 4, 'the first call after openMs is the probe')

  service.handle({ id: 'p-6', route: 'browse' }, { at: clock.at() })
  assert.equal(attempted(calls, 'db.primary'), 4, 'the probe is the only call that gets through, and it failed')
  assert.equal(service.breakerState('db.primary'), 'open')

  clock.advance(29999)
  service.handle({ id: 'p-7', route: 'browse' }, { at: clock.at() })
  assert.equal(attempted(calls, 'db.primary'), 4, 'the breaker was re-opened for another openMs')

  clock.advance(1)
  service.handle({ id: 'p-8', route: 'browse' }, { at: clock.at() })
  assert.equal(attempted(calls, 'db.primary'), 5, 'the next window owns the next probe')
})

test('a success clears the run of failures', () => {
  const clock = createClock(0)
  const { service, calls } = scenario({
    clock,
    script: {
      'db.primary': [
        RESPONSES.error('down'),
        RESPONSES.error('down'),
        RESPONSES.ok({ recovered: true }),
        RESPONSES.error('down'),
        RESPONSES.error('down'),
      ],
    },
  })

  service.handle({ id: 'w-1', route: 'browse' }, { at: clock.at() })
  service.handle({ id: 'w-2', route: 'browse' }, { at: clock.at() })
  service.handle({ id: 'w-3', route: 'browse' }, { at: clock.at() })
  assert.equal(service.breakerState('db.primary'), 'closed', 'the success in the middle cleared the count')

  service.handle({ id: 'w-4', route: 'browse' }, { at: clock.at() })
  service.handle({ id: 'w-5', route: 'browse' }, { at: clock.at() })
  assert.equal(service.breakerState('db.primary'), 'closed', 'two failures after a success is not three')
  assert.equal(attempted(calls, 'db.primary'), 5)

  service.handle({ id: 'w-6', route: 'browse' }, { at: clock.at() })
  assert.equal(service.breakerState('db.primary'), 'open')
})

test('a failed probe rearms the breaker for another openMs', () => {
  const clock = createClock(0)
  const { service, calls } = scenario({
    clock,
    script: {
      'db.primary': [
        RESPONSES.error('d'), RESPONSES.error('d'), RESPONSES.error('d'),
        RESPONSES.error('still down'), RESPONSES.ok({ back: true }), RESPONSES.ok({ back: true }),
      ],
    },
  })

  for (const id of ['c-1', 'c-2', 'c-3']) service.handle({ id, route: 'browse' }, { at: clock.at() })
  assert.equal(service.breakerState('db.primary'), 'open')

  clock.advance(30000)
  service.handle({ id: 'c-4', route: 'browse' }, { at: clock.at() })
  assert.equal(attempted(calls, 'db.primary'), 4, 'the first call after openMs is the probe')
  assert.equal(service.breakerState('db.primary'), 'open', 'the probe failed, so the breaker is open again')
  assert.equal(service.isDegraded('db.primary'), true)

  service.handle({ id: 'c-5', route: 'browse' }, { at: clock.at() })
  assert.equal(attempted(calls, 'db.primary'), 4, 'and the wait starts over')

  clock.advance(29999)
  service.handle({ id: 'c-6', route: 'browse' }, { at: clock.at() })
  assert.equal(attempted(calls, 'db.primary'), 4)

  clock.advance(1)
  service.handle({ id: 'c-7', route: 'browse' }, { at: clock.at() })
  assert.equal(attempted(calls, 'db.primary'), 5, 'the next window owns the next probe')
  assert.equal(service.breakerState('db.primary'), 'closed', 'and this one answered, so the calls flow again')

  service.handle({ id: 'c-8', route: 'browse' }, { at: clock.at() })
  assert.equal(service.isDegraded('db.primary'), false)
  assert.equal(attempted(calls, 'db.primary'), 6)
})
