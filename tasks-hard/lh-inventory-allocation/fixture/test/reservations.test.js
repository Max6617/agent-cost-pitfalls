// Reproductions for the order service: holds that outlive their deadline and
// holds that cannot be handed back.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAllocator } from '../src/index.js'

const at = (m) => '2024-05-01T09:' + String(m).padStart(2, '0') + ':00.000Z'
const W = 'north'
const S = 'SKU-BOLT-6'

test('a reservation that has passed its deadline stops holding stock', () => {
  const allocator = createAllocator()
  allocator.receive({ warehouse: W, sku: S, qty: 10, at: at(0) })
  const reserved = allocator.reserve({ orderId: 'o-1', sku: S, warehouse: W, qty: 4, at: at(0), ttlMs: 20 * 60 * 1000 })
  assert.equal(reserved.reservation.expiresAt, at(20))
  assert.equal(allocator.held({ warehouse: W, sku: S, at: at(15) }), 4)
  assert.equal(allocator.held({ warehouse: W, sku: S, at: at(25) }), 0)
})

test('releasing a reservation gives its stock back to the shelf', () => {
  const allocator = createAllocator()
  allocator.receive({ warehouse: W, sku: S, qty: 10, at: at(0) })
  const reserved = allocator.reserve({ orderId: 'o-1', sku: S, warehouse: W, qty: 4, at: at(0) })
  const released = allocator.release(reserved.reservation.id, { at: at(5) })
  assert.equal(released.status, 'released')
  assert.equal(released.released, 4)
  assert.equal(allocator.held({ warehouse: W, sku: S, at: at(5) }), 0)
})

test('releasing an id nobody knows reports a status instead of throwing', () => {
  const allocator = createAllocator()
  const unknown = allocator.release('rs-4242', { at: at(0) })
  assert.equal(unknown.status, 'unknown')
  assert.equal(unknown.released, 0)
})
