// Sub-problem 5: one hold per order, sku and warehouse - and cancelling once.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAllocator } from '../src/index.js'

const T = (h, m = 0) =>
  '2024-05-01T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00.000Z'
const W = 'north'
const W2 = 'south'
const S1 = 'SKU-BOLT-6'
const S2 = 'SKU-BOLT-8'
// a day-long hold, so nothing in this file turns on a deadline
const DAY = 24 * 60 * 60 * 1000
const engine = () => createAllocator({ defaultTtlMs: DAY })

test('the same order cannot hold the same shelf twice', () => {
  const allocator = engine()
  allocator.receive({ warehouse: W, sku: S1, qty: 10, at: T(6) })

  const first = allocator.reserve({ orderId: 'o-1', sku: S1, warehouse: W, qty: 4, at: T(6) })
  assert.equal(first.status, 'reserved')

  const again = allocator.reserve({ orderId: 'o-1', sku: S1, warehouse: W, qty: 6, at: T(6, 5) })
  assert.equal(again.status, 'already-held')
  assert.equal(again.reservation.id, first.reservation.id)
  assert.equal(again.reservation.qty, 4)
  assert.equal(allocator.held({ warehouse: W, sku: S1, at: T(6, 5) }), 4)
})

// interaction: the hold has to be per triple, and a cancellation has to walk
// every hold the order still has, not the first one it finds.
test('an order may hold two skus, and cancelling it gives both of them back', () => {
  const allocator = engine()
  allocator.receive({ warehouse: W, sku: S1, qty: 10, at: T(6) })
  allocator.receive({ warehouse: W, sku: S2, qty: 10, at: T(6) })

  const bolts = allocator.reserve({ orderId: 'o-7', sku: S1, warehouse: W, qty: 4, at: T(6) })
  assert.equal(bolts.status, 'reserved')
  const washers = allocator.reserve({ orderId: 'o-7', sku: S2, warehouse: W, qty: 5, at: T(6, 5) })
  assert.equal(washers.status, 'reserved')

  assert.equal(allocator.held({ warehouse: W, sku: S1, at: T(6, 10) }), 4)
  assert.equal(allocator.held({ warehouse: W, sku: S2, at: T(6, 10) }), 5)

  const cancelled = allocator.cancelOrder('o-7', { at: T(6, 20) })
  assert.equal(cancelled.status, 'cancelled')
  assert.equal(cancelled.released, 9)
  assert.equal(allocator.held({ warehouse: W, sku: S1, at: T(6, 20) }), 0)
  assert.equal(allocator.held({ warehouse: W, sku: S2, at: T(6, 20) }), 0)
})

test('the same sku bought from another warehouse is a separate hold', () => {
  const allocator = engine()
  allocator.receive({ warehouse: W, sku: S1, qty: 10, at: T(6) })
  allocator.receive({ warehouse: W2, sku: S1, qty: 10, at: T(6) })

  const north = allocator.reserve({ orderId: 'o-1', sku: S1, warehouse: W, qty: 4, at: T(6) })
  assert.equal(north.status, 'reserved')
  const south = allocator.reserve({ orderId: 'o-1', sku: S1, warehouse: W2, qty: 5, at: T(6, 5) })
  assert.equal(south.status, 'reserved')

  assert.equal(allocator.held({ warehouse: W, sku: S1, at: T(6, 10) }), 4)
  assert.equal(allocator.held({ warehouse: W2, sku: S1, at: T(6, 10) }), 5)
  assert.equal(allocator.reservations({ orderId: 'o-1', live: true, at: T(6, 10) }).length, 2)
})

// interaction: cancelling is not cumulative, and the order can be promised
// stock again afterwards because nothing is holding the shelf any more.
test('cancelling an order twice credits it once, and the shelf is free again', () => {
  const allocator = engine()
  allocator.receive({ warehouse: W, sku: S1, qty: 10, at: T(6) })
  const kept = allocator.reserve({ orderId: 'o-9', sku: S1, warehouse: W, qty: 4, at: T(6) })
  assert.equal(kept.status, 'reserved')

  const first = allocator.cancelOrder('o-9', { at: T(6, 10) })
  assert.equal(first.status, 'cancelled')
  assert.equal(first.released, 4)
  assert.equal(allocator.held({ warehouse: W, sku: S1, at: T(6, 10) }), 0)

  const second = allocator.cancelOrder('o-9', { at: T(6, 20) })
  assert.equal(second.status, 'already-cancelled')
  assert.equal(second.released, 0)

  const again = allocator.reserve({ orderId: 'o-9', sku: S1, warehouse: W, qty: 6, at: T(6, 30) })
  assert.equal(again.status, 'reserved')
  assert.equal(allocator.held({ warehouse: W, sku: S1, at: T(6, 30) }), 6)
})
