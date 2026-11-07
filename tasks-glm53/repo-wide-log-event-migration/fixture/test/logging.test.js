import test from 'node:test'
import assert from 'node:assert/strict'
import { withContext, EVENTS, UnknownEventError } from '../src/logger.js'
import { Inventory } from '../src/services/inventory.js'
import { ReservationWorker } from '../src/services/reservations.js'
import { runPlugins, completeOrder } from '../src/services/checkout.js'
import { Provider } from '../src/services/payment.js'
import { rateFor, expressRateFor } from '../src/services/shipping.js'
import { OrderStore } from '../src/services/orders.js'

/** A logger sink that records the JSON lines it is handed. */
function recorder() {
  const lines = []
  return { lines, sink: { log: (line) => lines.push(JSON.parse(line)) } }
}

/** Every structured event (not a plain info/warn/error message) in order. */
function events(lines) {
  return lines.filter((l) => l.event !== undefined)
}

function only(lines, event) {
  const found = events(lines).filter((l) => l.event === event)
  assert.equal(found.length, 1, 'expected exactly one ' + event + ', got ' + JSON.stringify(events(lines)))
  return found[0]
}

test('a short reservation reports a stock discrepancy with the numbers', () => {
  const { lines, sink } = recorder()
  const inventory = new Inventory({ logger: withContext({ orderId: 'A-1' }, sink) }).load({ 'TEA-01': 1 })

  inventory.reserve('TEA-01', 4)

  const line = only(lines, 'inventory.stock_discrepancy')
  assert.deepEqual(line.data, { sku: 'TEA-01', missing: 3, onHand: 1 })
  assert.deepEqual(line.context, { orderId: 'A-1' })
})

test('a reservation that fits says nothing about discrepancies', () => {
  const { lines, sink } = recorder()
  const inventory = new Inventory({ logger: withContext({}, sink) }).load({ 'TEA-01': 9 })

  inventory.reserve('TEA-01', 4)

  assert.deepEqual(events(lines).filter((l) => l.event === 'inventory.stock_discrepancy'), [])
})

test('the worker records what it actually reserved', () => {
  const { lines, sink } = recorder()
  const inventory = new Inventory({ logger: withContext({}, sink) }).load({ 'TEA-01': 5, 'MUG-04': 1 })
  const worker = new ReservationWorker({ inventory, logger: withContext({ batch: 'b7' }, sink) })

  worker.handle({ lines: [{ sku: 'TEA-01', qty: 2 }, { sku: 'MUG-04', qty: 3 }] })

  const reserved = events(lines).filter((l) => l.event === 'inventory.reserved')
  assert.deepEqual(
    reserved.map((l) => l.data),
    [{ sku: 'TEA-01', units: 2 }, { sku: 'MUG-04', units: 1 }],
  )
  for (const line of reserved) {
    assert.equal(line.context.worker, 'reservation', 'the child context must survive')
    assert.equal(line.context.batch, 'b7')
  }
})

test('a failing plugin is recorded by name and reason', () => {
  const { lines, sink } = recorder()
  const boom = { name: 'tax-eu', apply: () => { throw new Error('matrix unavailable') } }

  runPlugins([boom], { id: 'A-1' }, withContext({}, sink))

  const line = only(lines, 'checkout.plugin_failed')
  assert.equal(line.data.plugin, 'tax-eu')
  assert.match(String(line.data.reason), /matrix unavailable/)
})

test('a completed order is a structured event, not prose', () => {
  const { lines, sink } = recorder()

  completeOrder({ id: 'A-1', total: 42.5 }, withContext({}, sink))

  const line = only(lines, 'checkout.completed')
  assert.deepEqual(line.data, { orderId: 'A-1', total: 42.5 })
})

test('a refused capture names the provider', () => {
  const { lines, sink } = recorder()
  const provider = new Provider('stripe-ish', withContext({}, sink))

  provider.capture('A-1', 0)

  const line = only(lines, 'payment.capture_failed')
  assert.equal(line.data.orderId, 'A-1')
  assert.equal(line.data.provider, 'stripe-ish')
})

test('a refund is a structured event', () => {
  const { lines, sink } = recorder()

  new Provider('stripe-ish', withContext({}, sink)).refund('A-1', 12.5)

  const line = only(lines, 'payment.refund_issued')
  assert.deepEqual(line.data, { orderId: 'A-1', amount: 12.5 })
})

test('a scheduled retry carries the attempt number', () => {
  const { lines, sink } = recorder()

  new Provider('stripe-ish', withContext({}, sink)).scheduleRetry('A-1', 2)

  const line = only(lines, 'payment.retry_scheduled')
  assert.deepEqual(line.data, { orderId: 'A-1', attempt: 2 })
})

test('an uncovered postcode is reported with the carrier', () => {
  const { lines, sink } = recorder()

  rateFor('royalmail', 'ZZ9 9ZZ', withContext({}, sink))

  const line = only(lines, 'shipping.rate_missing')
  assert.equal(line.data.carrier, 'royalmail')
  assert.equal(line.data.postcode, 'ZZ9 9ZZ')
})

test('the express lookup reports the same missing-rate event once', () => {
  const { lines, sink } = recorder()

  expressRateFor('dpd', 'ZZ9 9ZZ', withContext({}, sink))

  only(lines, 'shipping.rate_missing')
})

test('cancelling an order is a structured event', () => {
  const { lines, sink } = recorder()
  const store = new OrderStore({ logger: withContext({}, sink) })
  store.create({ id: 'A-1', total: 10 })

  store.cancel('A-1', 'customer-request')

  const line = only(lines, 'order.cancelled')
  assert.equal(line.data.orderId, 'A-1')
})

test('amending an order names the fields that changed', () => {
  const { lines, sink } = recorder()
  const store = new OrderStore({ logger: withContext({}, sink) })
  store.create({ id: 'A-1', total: 10 })

  store.amend('A-1', { total: 12, note: 'gift' })

  const line = only(lines, 'order.amended')
  assert.equal(line.data.orderId, 'A-1')
  assert.deepEqual([...line.data.fields].sort(), ['note', 'total'])
})

test('every emitted event is one the logger declares', () => {
  const { lines, sink } = recorder()
  const log = withContext({}, sink)
  const inventory = new Inventory({ logger: log }).load({ 'TEA-01': 0 })
  inventory.reserve('TEA-01', 2)
  runPlugins([{ name: 'p', apply: () => { throw new Error('x') } }], {}, log)
  new Provider('p', log).refund('A-1', 1)
  rateFor('c', 'ZZ9 9ZZ', log)

  for (const line of events(lines)) {
    assert.ok(Object.prototype.hasOwnProperty.call(EVENTS, line.event), 'undeclared event ' + line.event)
  }
})

test('the structured path is what carries the event name', () => {
  const { lines, sink } = recorder()
  const inventory = new Inventory({ logger: withContext({}, sink) }).load({ 'TEA-01': 0 })
  inventory.reserve('TEA-01', 2)

  assert.equal(lines.length >= 1, true)
  assert.equal(typeof lines[0].event, 'string')
  assert.equal(lines[0].level, 'warn')
})

test('an undeclared event is a programming error, not a silent log line', () => {
  const { sink } = recorder()
  assert.throws(() => withContext({}, sink).event('made.up.event', {}), UnknownEventError)
})
