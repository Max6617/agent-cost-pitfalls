// Sub-problem 4: part lines, backorders, and what a pack is worth.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAllocator } from '../src/index.js'

const T = (h, m = 0) =>
  '2024-05-01T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00.000Z'
const W = 'north'
const S = 'SKU-BOLT-6'
// a day-long hold, so nothing in this file turns on a deadline
const engine = (options = {}) => createAllocator({ defaultTtlMs: 24 * 60 * 60 * 1000, ...options })

test('a line the shelf covers in full ships exactly as asked, never rounded up to a pack', () => {
  const allocator = engine({ packSize: 6 })
  allocator.receive({ warehouse: W, sku: S, qty: 8, at: T(6) })
  allocator.addDemand({ orderId: 'o-1', sku: S, warehouse: W, qty: 7, priority: 1, placedAt: T(6) })

  const run = allocator.allocate({ at: T(7) })
  assert.equal(run.lines[0].added, 7)
  assert.equal(run.lines[0].status, 'allocated')
  assert.equal(allocator.held({ warehouse: W, sku: S, at: T(7) }), 7)

  const atp = allocator.atp({ sku: S, warehouse: W, at: T(7) })
  assert.equal(atp.onHand, 8)
  assert.equal(atp.available, 1)
})

test('a short fill is trimmed down to whole packs and never exceeds the shelf', () => {
  const allocator = engine({ packSize: 6 })
  allocator.receive({ warehouse: W, sku: S, qty: 15, at: T(6) })
  allocator.addDemand({ orderId: 'o-1', sku: S, warehouse: W, qty: 20, priority: 1, placedAt: T(6) })

  const run = allocator.allocate({ at: T(7) })
  assert.equal(run.lines[0].added, 12)
  assert.equal(run.lines[0].outstanding, 8)
  assert.equal(run.lines[0].status, 'partial')
  assert.equal(allocator.held({ warehouse: W, sku: S, at: T(7) }), 12)

  const backorders = allocator.backorders()
  assert.equal(backorders.length, 1)
  assert.equal(backorders[0].outstanding, 8)
})

// interaction: the pack rule and the backorder refill - a shelf that grows by
// three units and then by two has to be re-measured in packs each time.
test('a backorder is refilled in packs as the shelf grows, one pass at a time', () => {
  const allocator = engine({ packSize: 6 })
  allocator.receive({ warehouse: W, sku: S, qty: 15, at: T(6) })
  allocator.addDemand({ orderId: 'o-1', sku: S, warehouse: W, qty: 20, priority: 1, placedAt: T(6) })

  const pass1 = allocator.allocate({ at: T(7) })
  assert.equal(pass1.lines[0].added, 12)
  assert.equal(pass1.lines[0].outstanding, 8)

  allocator.receive({ warehouse: W, sku: S, qty: 3, at: T(8) })
  const pass2 = allocator.allocate({ at: T(9) })
  assert.equal(pass2.lines[0].added, 6)
  assert.equal(pass2.lines[0].filled, 18)
  assert.equal(pass2.lines[0].outstanding, 2)

  allocator.receive({ warehouse: W, sku: S, qty: 2, at: T(10) })
  const pass3 = allocator.allocate({ at: T(11) })
  assert.equal(pass3.lines[0].added, 2)
  assert.equal(pass3.lines[0].status, 'allocated')
  assert.equal(allocator.held({ warehouse: W, sku: S, at: T(11) }), 20)
  assert.deepEqual(allocator.backorders(), [])
})

test('two lines on one shelf never take more than the shelf is holding', () => {
  const allocator = engine({ packSize: 6 })
  allocator.receive({ warehouse: W, sku: S, qty: 30, at: T(6) })
  allocator.addDemand({ orderId: 'o-1', sku: S, warehouse: W, qty: 20, priority: 1, placedAt: T(6) })
  allocator.addDemand({ orderId: 'o-2', sku: S, warehouse: W, qty: 20, priority: 2, placedAt: T(6) })

  const run = allocator.allocate({ at: T(7) })
  assert.deepEqual(run.lines.map((line) => [line.orderId, line.added]), [['o-1', 20], ['o-2', 6]])
  assert.equal(run.filled, 26)
  assert.equal(allocator.held({ warehouse: W, sku: S, at: T(7) }), 26)
  assert.deepEqual(
    allocator.backorders().map((line) => [line.orderId, line.outstanding]),
    [['o-2', 14]],
  )
})
