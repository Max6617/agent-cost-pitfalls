// Reproductions from the console: the promise report and what it is made of.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAllocator } from '../src/index.js'

const at = (m) => '2024-05-01T09:' + String(m).padStart(2, '0') + ':00.000Z'
const W = 'north'
const S = 'SKU-BOLT-6'

test('available is on hand less what is promised, less the channel buffer', () => {
  const allocator = createAllocator()
  allocator.receive({ warehouse: W, sku: S, qty: 40, at: at(0) })
  allocator.setBuffer({ channel: 'web', sku: S, warehouse: W, qty: 12 })
  allocator.reserve({ orderId: 'o-1', sku: S, warehouse: W, qty: 5, at: at(0) })

  const report = allocator.atp({ sku: S, warehouse: W, channel: 'web', at: at(10) })
  assert.equal(report.onHand, 40)
  assert.equal(report.held, 5)
  assert.equal(report.buffer, 12)
  assert.equal(report.available, 23)
})

test('the report drops a promise as soon as the promise is released', () => {
  const allocator = createAllocator()
  allocator.receive({ warehouse: W, sku: S, qty: 20, at: at(0) })
  allocator.setBuffer({ channel: 'web', sku: S, warehouse: W, qty: 5 })
  const reserved = allocator.reserve({ orderId: 'o-1', sku: S, warehouse: W, qty: 8, at: at(0) })

  assert.equal(allocator.atp({ sku: S, warehouse: W, channel: 'web', at: at(10) }).available, 7)
  allocator.release(reserved.reservation.id, { at: at(10) })
  const after = allocator.atp({ sku: S, warehouse: W, channel: 'web', at: at(10) })
  assert.equal(after.held, 0)
  assert.equal(after.available, 15)
})
