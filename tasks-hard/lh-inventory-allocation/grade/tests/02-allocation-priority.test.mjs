// Sub-problem 2: the order a picking run walks the queue in.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAllocator } from '../src/index.js'

const T = (h, m = 0) =>
  '2024-05-01T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00.000Z'
const W = 'north'
const S = 'SKU-BOLT-6'
// a day-long hold, so nothing in this file turns on a deadline
const engine = () => createAllocator({ defaultTtlMs: 24 * 60 * 60 * 1000 })

const added = (run) => Object.fromEntries(run.lines.map((line) => [line.orderId, line.added]))

test('a high-priority line takes the shelf before a low-priority one that queued earlier', () => {
  const allocator = engine()
  allocator.receive({ warehouse: W, sku: S, qty: 10, at: T(6) })
  allocator.addDemand({ orderId: 'o-bulk', sku: S, warehouse: W, qty: 10, priority: 50, placedAt: T(6) })
  allocator.addDemand({ orderId: 'o-urgent', sku: S, warehouse: W, qty: 10, priority: 1, placedAt: T(6, 5) })

  const run = allocator.allocate({ at: T(7) })
  assert.equal(run.lines[0].orderId, 'o-urgent')
  assert.deepEqual(added(run), { 'o-urgent': 10, 'o-bulk': 0 })
  assert.equal(run.filled, 10)
  assert.deepEqual(allocator.backorders().map((line) => [line.orderId, line.outstanding]), [['o-bulk', 10]])
})

test('within one priority the older line is served first, even when it queued later', () => {
  const allocator = engine()
  allocator.receive({ warehouse: W, sku: S, qty: 6, at: T(6) })
  allocator.addDemand({ orderId: 'o-new', sku: S, warehouse: W, qty: 6, priority: 5, placedAt: T(8) })
  allocator.addDemand({ orderId: 'o-old', sku: S, warehouse: W, qty: 6, priority: 5, placedAt: T(6, 30) })

  const run = allocator.allocate({ at: T(9) })
  assert.equal(run.lines[0].orderId, 'o-old')
  assert.deepEqual(added(run), { 'o-old': 6, 'o-new': 0 })
})

test('lines that share priority and age are separated by id', () => {
  const allocator = engine()
  allocator.receive({ warehouse: W, sku: S, qty: 6, at: T(6) })
  allocator.addDemand({ orderId: 'o-2', sku: S, warehouse: W, qty: 6, priority: 5, placedAt: T(6) })
  allocator.addDemand({ orderId: 'o-1', sku: S, warehouse: W, qty: 6, priority: 5, placedAt: T(6) })

  const run = allocator.allocate({ at: T(9) })
  assert.equal(run.lines[0].orderId, 'o-1')
  assert.deepEqual(added(run), { 'o-1': 6, 'o-2': 0 })
})

// interaction: what a confirmed allocation protects, what a backorder does not,
// and what happens to both when the promise is given back.
test('a new line may take stock a backorder is waiting for, but never stock a confirmed line holds', () => {
  const allocator = engine()
  allocator.receive({ warehouse: W, sku: S, qty: 10, at: T(6) })
  allocator.addDemand({ orderId: 'o-5', sku: S, warehouse: W, qty: 10, priority: 50, placedAt: T(6) })

  const first = allocator.allocate({ at: T(6, 10) })
  assert.deepEqual(added(first), { 'o-5': 10 })
  assert.equal(first.lines[0].status, 'allocated')

  allocator.addDemand({ orderId: 'o-1', sku: S, warehouse: W, qty: 10, priority: 1, placedAt: T(6, 20) })
  const second = allocator.allocate({ at: T(6, 30) })
  assert.equal(second.filled, 0)
  assert.equal(second.lines[0].orderId, 'o-1')
  assert.equal(second.lines[0].outstanding, 10)
  assert.equal(allocator.held({ warehouse: W, sku: S, at: T(6, 30) }), 10)

  const kept = allocator.reservations({ orderId: 'o-5', live: true, at: T(6, 30) })
  assert.equal(kept.length, 1)
  assert.equal(allocator.release(kept[0].id, { at: T(6, 40) }).status, 'released')
  assert.equal(allocator.held({ warehouse: W, sku: S, at: T(6, 40) }), 0)

  const third = allocator.allocate({ at: T(6, 50) })
  assert.equal(third.lines[0].orderId, 'o-1')
  assert.deepEqual(added(third), { 'o-1': 10, 'o-5': 0 })
  assert.equal(third.filled, 10)
})
