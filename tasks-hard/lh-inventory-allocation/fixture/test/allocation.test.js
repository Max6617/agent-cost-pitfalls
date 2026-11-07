// Reproductions from the pick line: who gets the stock when two orders want it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAllocator } from '../src/index.js'

const at = (m) => '2024-05-01T09:' + String(m).padStart(2, '0') + ':00.000Z'
const W = 'north'
const S = 'SKU-BOLT-6'

test('the more urgent of two queued orders is served first', () => {
  const allocator = createAllocator()
  allocator.receive({ warehouse: W, sku: S, qty: 10, at: at(0) })
  allocator.addDemand({ orderId: 'o-bulk', sku: S, warehouse: W, qty: 10, priority: 50, placedAt: at(0) })
  allocator.addDemand({ orderId: 'o-urgent', sku: S, warehouse: W, qty: 10, priority: 1, placedAt: at(5) })

  const run = allocator.allocate({ at: at(10) })
  assert.equal(run.lines[0].orderId, 'o-urgent')
  assert.equal(run.filled, 10)
  assert.deepEqual(allocator.backorders().map((line) => line.orderId), ['o-bulk'])
})

test('an order bigger than the shelf is filled in part and backordered', () => {
  const allocator = createAllocator()
  allocator.receive({ warehouse: W, sku: S, qty: 10, at: at(0) })
  allocator.addDemand({ orderId: 'o-1', sku: S, warehouse: W, qty: 15, priority: 1, placedAt: at(0) })

  const run = allocator.allocate({ at: at(10) })
  assert.equal(run.lines[0].filled, 10)
  assert.equal(run.lines[0].outstanding, 5)
  assert.equal(run.lines[0].status, 'partial')
  assert.equal(allocator.backorders()[0].outstanding, 5)
})

test('a later receipt fills the backorder on the next pass', () => {
  const allocator = createAllocator()
  allocator.receive({ warehouse: W, sku: S, qty: 10, at: at(0) })
  allocator.addDemand({ orderId: 'o-1', sku: S, warehouse: W, qty: 15, priority: 1, placedAt: at(0) })
  allocator.allocate({ at: at(10) })

  allocator.receive({ warehouse: W, sku: S, qty: 5, at: at(20) })
  const run = allocator.allocate({ at: at(30) })
  assert.equal(run.lines[0].filled, 15)
  assert.equal(run.lines[0].status, 'allocated')
  assert.deepEqual(allocator.backorders(), [])
})
