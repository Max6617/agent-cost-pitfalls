// Reproductions from merchandising: the stock a channel keeps back.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAllocator } from '../src/index.js'

const at = (m) => '2024-05-01T09:' + String(m).padStart(2, '0') + ':00.000Z'
const W = 'north'
const S = 'SKU-BOLT-6'

test('a channel cannot allocate away its own safety stock', () => {
  const allocator = createAllocator()
  allocator.receive({ warehouse: W, sku: S, qty: 30, at: at(0) })
  allocator.setBuffer({ channel: 'web', sku: S, warehouse: W, qty: 10 })
  allocator.setBuffer({ channel: 'trade', sku: S, warehouse: W, qty: 4 })

  allocator.addDemand({ orderId: 'o-1', sku: S, warehouse: W, qty: 30, priority: 1, channel: 'web', placedAt: at(0) })
  const run = allocator.allocate({ at: at(10) })
  assert.equal(run.lines[0].added, 20)
  assert.equal(run.lines[0].outstanding, 10)
})

test('allowBuffer lets a caller spend the safety stock on purpose', () => {
  const allocator = createAllocator()
  allocator.receive({ warehouse: W, sku: S, qty: 30, at: at(0) })
  allocator.setBuffer({ channel: 'web', sku: S, warehouse: W, qty: 10 })
  allocator.setBuffer({ channel: 'trade', sku: S, warehouse: W, qty: 4 })

  allocator.addDemand({ orderId: 'o-1', sku: S, warehouse: W, qty: 30, priority: 1, channel: 'web', placedAt: at(0) })
  const run = allocator.allocate({ at: at(10), allowBuffer: true })
  assert.equal(run.lines[0].added, 30)
  assert.equal(run.lines[0].status, 'allocated')
})
