import test from 'node:test'
import assert from 'node:assert/strict'
import { makeSubscription, inCallOrder, resetSequence } from '../src/subscriptions.js'
import { EventBus } from '../src/bus.js'
import { counter, installStandardListeners } from '../src/wiring.js'

/** A handler that records its name when called. */
function recorder(log, name) {
  return () => log.push(name)
}

test('a handler is called with the payload', () => {
  const bus = new EventBus()
  let seen = null
  bus.on('ping', (payload) => { seen = payload })
  bus.emit('ping', { n: 1 })
  assert.deepEqual(seen, { n: 1 })
})

test('handlers run in registration order at equal priority', () => {
  const log = []
  const bus = new EventBus()
  bus.on('ping', recorder(log, 'a'))
  bus.on('ping', recorder(log, 'b'))
  bus.on('ping', recorder(log, 'c'))
  bus.emit('ping')
  assert.deepEqual(log, ['a', 'b', 'c'])
})

test('higher priority runs first', () => {
  const log = []
  const bus = new EventBus()
  bus.on('ping', recorder(log, 'low'), { priority: 0 })
  bus.on('ping', recorder(log, 'high'), { priority: 5 })
  bus.on('ping', recorder(log, 'middle'), { priority: 2 })
  bus.emit('ping')
  assert.deepEqual(log, ['high', 'middle', 'low'])
})

test('priority beats registration order and the order is stable', () => {
  const log = []
  const bus = new EventBus()
  bus.on('ping', recorder(log, 'first-registered'), { priority: 0 })
  bus.on('ping', recorder(log, 'second-registered'), { priority: 9 })
  bus.emit('ping')
  assert.deepEqual(log, ['second-registered', 'first-registered'])
  assert.deepEqual(log, ['second-registered', 'first-registered'])
})

test('an event with no subscribers is not an error', () => {
  const bus = new EventBus()
  assert.deepEqual(bus.emit('nobody'), { called: 0, errors: [] })
})

test('a once handler runs a single time', () => {
  const log = []
  const bus = new EventBus()
  bus.once('ping', recorder(log, 'once'))
  bus.emit('ping')
  bus.emit('ping')
  assert.deepEqual(log, ['once'])
  assert.equal(bus.count('ping'), 0)
})

test('a once handler that re-emits does not call itself', () => {
  const log = []
  const bus = new EventBus()
  bus.once('ping', () => {
    log.push('once')
    bus.emit('ping')
  })
  bus.emit('ping')
  assert.deepEqual(log, ['once'])
})

test('off removes a subscription', () => {
  const log = []
  const bus = new EventBus()
  const remove = bus.on('ping', recorder(log, 'a'))
  remove()
  bus.emit('ping')
  assert.deepEqual(log, [])
  assert.equal(bus.count('ping'), 0)
})

test('a throwing handler does not stop the others', () => {
  const log = []
  const bus = new EventBus()
  bus.on('ping', () => { throw new Error('boom') })
  bus.on('ping', recorder(log, 'after'))
  const result = bus.emit('ping')
  assert.deepEqual(log, ['after'])
  assert.equal(result.errors.length, 1)
  assert.equal(result.errors[0].name, 'ping')
})

test('errors are collected rather than thrown', () => {
  const bus = new EventBus()
  bus.on('ping', () => { throw new Error('one') })
  bus.on('ping', () => { throw new Error('two') })
  const result = bus.emit('ping')
  assert.equal(result.errors.length, 2)
  assert.equal(result.called, 0)
})

test('the called count is the handlers that finished', () => {
  const bus = new EventBus()
  bus.on('ping', () => {})
  bus.on('ping', () => { throw new Error('boom') })
  bus.on('ping', () => {})
  assert.equal(bus.emit('ping').called, 2)
})

test('clear removes one event or all of them', () => {
  const bus = new EventBus()
  bus.on('a', () => {})
  bus.on('b', () => {})
  bus.clear('a')
  assert.equal(bus.count('a'), 0)
  assert.equal(bus.count('b'), 1)
  bus.clear()
  assert.equal(bus.count('b'), 0)
})

test('a subscription without a handler is refused', () => {
  assert.throws(() => makeSubscription('x', null), /needs a handler/)
})

test('the call order is a total order', () => {
  resetSequence()
  const a = makeSubscription('e', () => {}, { priority: 1 })
  const b = makeSubscription('e', () => {}, { priority: 1 })
  assert.deepEqual(inCallOrder([b, a]).map((s) => s.seq), [a.seq, b.seq])
})

test('the standard listeners run audit first and metrics last', () => {
  const log = []
  const bus = new EventBus()
  installStandardListeners(bus, { audit: recorder(log, 'audit'), metrics: recorder(log, 'metrics') })
  bus.on('order.placed', recorder(log, 'middle'))
  bus.emit('order.placed')
  assert.deepEqual(log, ['audit', 'middle', 'metrics'])
})

test('a counter listener sees every payload', () => {
  const bus = new EventBus()
  const metrics = counter('metrics')
  bus.on('ping', metrics.handler)
  bus.emit('ping', 1)
  bus.emit('ping', 2)
  assert.deepEqual(metrics.seen, [1, 2])
})
