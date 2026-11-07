import test from 'node:test'
import assert from 'node:assert/strict'
import { DeliveryStore, OUTCOME } from '../src/store.js'
import { handleDelivery, handleBatch, delivery } from '../src/intake.js'

/** The projection a handler would maintain. */
function ledger() {
  const state = new Map()
  return {
    state,
    apply(event) {
      state.set(event.subject, event.payload)
      return { subject: event.subject, applied: true }
    },
  }
}

test('a first delivery is applied', () => {
  const store = new DeliveryStore()
  const result = handleDelivery(store, delivery('e1', 'order-1', 1, { total: 10 }))
  assert.equal(result.outcome, OUTCOME.APPLIED)
  assert.equal(store.size, 1)
})

test('a redelivery of the same id is a duplicate and is not applied twice', () => {
  const store = new DeliveryStore()
  const log = ledger()
  const event = delivery('e1', 'order-1', 1, { total: 10 })

  handleDelivery(store, event, (e) => log.apply(e))
  const again = handleDelivery(store, event, (e) => log.apply(e))

  assert.equal(again.outcome, OUTCOME.DUPLICATE)
  assert.equal(store.size, 1)
})

test('a duplicate is reported as a duplicate even when it is also the newest', () => {
  const store = new DeliveryStore()
  const event = delivery('e1', 'order-1', 5)
  handleDelivery(store, event)
  assert.equal(handleDelivery(store, event).outcome, OUTCOME.DUPLICATE)
})

test('an older event that arrives late is stale', () => {
  const store = new DeliveryStore()
  handleDelivery(store, delivery('e2', 'order-1', 2))
  const result = handleDelivery(store, delivery('e1', 'order-1', 1))
  assert.equal(result.outcome, OUTCOME.STALE)
  assert.equal(result.latest, 2)
})

test('an event with the same sequence is stale, not applied again', () => {
  const store = new DeliveryStore()
  handleDelivery(store, delivery('e1', 'order-1', 3))
  assert.equal(handleDelivery(store, delivery('e9', 'order-1', 3)).outcome, OUTCOME.STALE)
})

test('a stale delivery is still remembered, so its redelivery is a duplicate', () => {
  const store = new DeliveryStore()
  handleDelivery(store, delivery('e2', 'order-1', 2))
  handleDelivery(store, delivery('e1', 'order-1', 1))
  assert.equal(store.has('e1'), true)
  assert.equal(handleDelivery(store, delivery('e1', 'order-1', 1)).outcome, OUTCOME.DUPLICATE)
})

test('subjects are tracked independently', () => {
  const store = new DeliveryStore()
  handleDelivery(store, delivery('e1', 'order-1', 5))
  assert.equal(handleDelivery(store, delivery('e2', 'order-2', 1)).outcome, OUTCOME.APPLIED)
})

test('a delivery with no id is rejected', () => {
  const store = new DeliveryStore()
  assert.equal(handleDelivery(store, { subject: 'a', sequence: 1 }).outcome, 'rejected')
  assert.equal(handleDelivery(store, null).outcome, 'rejected')
  assert.equal(store.size, 0)
})

test('the handler is called exactly once per applied event', () => {
  const store = new DeliveryStore()
  const seen = []
  handleBatch(store, [delivery('e1', 'a', 1), delivery('e1', 'a', 1), delivery('e2', 'a', 2)], (e) => seen.push(e.id))
  assert.deepEqual(seen, ['e1', 'e2'])
})

test('a batch reports one outcome per delivery, in order', () => {
  const store = new DeliveryStore()
  const outcomes = handleBatch(store, [
    delivery('e1', 'a', 1),
    delivery('e2', 'a', 2),
    delivery('e1', 'a', 1),
    delivery('e3', 'a', 1),
  ]).map((r) => r.outcome)

  assert.deepEqual(outcomes, [OUTCOME.APPLIED, OUTCOME.APPLIED, OUTCOME.DUPLICATE, OUTCOME.STALE])
})

test('out-of-order arrival converges on the same state', () => {
  const store = new DeliveryStore()
  const log = ledger()
  handleBatch(store, [delivery('e1', 'a', 1, { v: 1 }), delivery('e3', 'a', 3, { v: 3 }), delivery('e2', 'a', 2, { v: 2 })], (e) => log.apply(e))
  assert.deepEqual(log.state.get('a'), { v: 3 })
})

test('the newest sequence per subject is what staleness is judged against', () => {
  const store = new DeliveryStore()
  handleBatch(store, [delivery('e1', 'a', 1), delivery('e5', 'a', 5)])
  assert.equal(store.latestFor('a'), 5)
  assert.equal(store.latestFor('b'), null)
})

test('an applied event is visible to the store before the next delivery', () => {
  const store = new DeliveryStore()
  const order = []
  handleDelivery(store, delivery('e1', 'a', 1), () => order.push('apply-1'))
  handleDelivery(store, delivery('e2', 'a', 2), () => order.push('apply-2'))
  assert.deepEqual(order, ['apply-1', 'apply-2'])
  assert.equal(store.size, 2)
})
