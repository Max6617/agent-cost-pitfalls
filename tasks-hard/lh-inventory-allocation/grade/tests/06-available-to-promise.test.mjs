// Sub-problem 6: the promise report, and the totals it must not serve stale.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAllocator } from '../src/index.js'

const T = (h, m = 0) =>
  '2024-05-01T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00.000Z'
const W = 'north'
const W2 = 'south'
const S = 'SKU-BOLT-6'
// a day-long hold, so nothing in this file turns on a deadline
const engine = () => createAllocator({ defaultTtlMs: 24 * 60 * 60 * 1000 })

test('available is what is on hand, less what is promised, less the channel buffer', () => {
  const allocator = engine()
  allocator.receive({ warehouse: W, sku: S, qty: 40, at: T(6) })
  allocator.setBuffer({ channel: 'web', sku: S, warehouse: W, qty: 12 })
  assert.equal(allocator.reserve({ orderId: 'o-1', sku: S, warehouse: W, qty: 5, at: T(6) }).status, 'reserved')

  const atp = allocator.atp({ sku: S, warehouse: W, channel: 'web', at: T(7) })
  assert.equal(atp.channel, 'web')
  assert.equal(atp.onHand, 40)
  assert.equal(atp.held, 5)
  assert.equal(atp.buffer, 12)
  assert.equal(atp.available, 23)
})

test('each warehouse reports its own shelf', () => {
  const allocator = engine()
  allocator.receive({ warehouse: W, sku: S, qty: 10, at: T(6) })
  allocator.receive({ warehouse: W2, sku: S, qty: 7, at: T(6) })
  allocator.reserve({ orderId: 'o-1', sku: S, warehouse: W, qty: 4, at: T(6) })
  allocator.reserve({ orderId: 'o-2', sku: S, warehouse: W2, qty: 3, at: T(6) })

  const north = allocator.atp({ sku: S, warehouse: W, at: T(7) })
  assert.equal(north.warehouse, W)
  assert.equal(north.onHand, 10)
  assert.equal(north.available, 6)

  const south = allocator.atp({ sku: S, warehouse: W2, at: T(7) })
  assert.equal(south.warehouse, W2)
  assert.equal(south.onHand, 7)
  assert.equal(south.held, 3)
  assert.equal(south.available, 4)
})

// interaction: the report, and the release that has to invalidate it - read at
// the same instant, so nothing but the release has changed.
test('a release is visible to the very next reader of the report', () => {
  const allocator = engine()
  allocator.receive({ warehouse: W, sku: S, qty: 20, at: T(6) })
  allocator.setBuffer({ channel: 'web', sku: S, warehouse: W, qty: 5 })
  const kept = allocator.reserve({ orderId: 'o-1', sku: S, warehouse: W, qty: 8, at: T(6) })

  const before = allocator.atp({ sku: S, warehouse: W, channel: 'web', at: T(7) })
  assert.equal(before.held, 8)
  assert.equal(before.available, 7)

  assert.equal(allocator.release(kept.reservation.id, { at: T(7) }).status, 'released')

  const after = allocator.atp({ sku: S, warehouse: W, channel: 'web', at: T(7) })
  assert.equal(after.held, 0)
  assert.equal(after.available, 15)
})

// interaction: a cancellation moves two ledgers at once, and the report has to
// agree with the holds the engine itself lists afterwards.
test('a cancellation is visible to the next reader, and the report agrees with the live holds', () => {
  const allocator = engine()
  allocator.receive({ warehouse: W, sku: S, qty: 30, at: T(6) })
  allocator.reserve({ orderId: 'o-1', sku: S, warehouse: W, qty: 6, at: T(6) })
  allocator.reserve({ orderId: 'o-2', sku: S, warehouse: W, qty: 9, at: T(6, 5) })

  const before = allocator.atp({ sku: S, warehouse: W, at: T(9) })
  assert.equal(before.held, 15)
  assert.equal(before.available, 15)

  const cancelled = allocator.cancelOrder('o-2', { at: T(9) })
  assert.equal(cancelled.status, 'cancelled')
  assert.equal(cancelled.released, 9)

  const live = allocator.reservations({ warehouse: W, sku: S, live: true, at: T(9) })
  assert.equal(live.length, 1)
  assert.equal(live[0].qty, 6)

  const after = allocator.atp({ sku: S, warehouse: W, at: T(9) })
  assert.equal(after.held, live.reduce((n, hold) => n + hold.qty, 0))
  assert.equal(after.available, 24)
})
