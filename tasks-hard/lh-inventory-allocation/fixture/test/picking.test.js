// Reproductions from the pick line at a site that shelves in case packs.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAllocator } from '../src/index.js'

const at = (m) => '2024-05-01T09:' + String(m).padStart(2, '0') + ':00.000Z'
const W = 'north'
const S = 'SKU-BOLT-6'

test('a line the shelf can cover is not rounded up to a whole pack', () => {
  const allocator = createAllocator({ packSize: 6 })
  allocator.receive({ warehouse: W, sku: S, qty: 8, at: at(0) })
  allocator.addDemand({ orderId: 'o-1', sku: S, warehouse: W, qty: 7, priority: 1, placedAt: at(0) })

  const run = allocator.allocate({ at: at(10) })
  assert.equal(run.lines[0].added, 7)
  assert.equal(run.lines[0].status, 'allocated')
})

test('a site that shelves in singles is unaffected by the pack size', () => {
  const allocator = createAllocator()
  allocator.receive({ warehouse: W, sku: S, qty: 15, at: at(0) })
  allocator.addDemand({ orderId: 'o-1', sku: S, warehouse: W, qty: 20, priority: 1, placedAt: at(0) })

  const run = allocator.allocate({ at: at(10) })
  assert.equal(run.lines[0].added, 15)
  assert.equal(run.lines[0].outstanding, 5)
})
