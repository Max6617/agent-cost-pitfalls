// Sub-problem 1: how long a hold lasts, and what giving one back reports.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAllocator } from '../src/index.js'

const T = (h, m = 0, s = 0) =>
  '2024-05-01T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' +
  String(s).padStart(2, '0') + '.000Z'
const W = 'north'
const S = 'SKU-BOLT-6'
const TTL = 30 * 60 * 1000

// interaction: the deadline that quietly freed the stock, and the pass that then
// has to hand it to a line already waiting for it.
test('a hold whose deadline has passed stops holding stock, with nothing run in between', () => {
  const allocator = createAllocator()
  allocator.receive({ warehouse: W, sku: S, qty: 10, at: T(6) })
  const reserved = allocator.reserve({ orderId: 'o-1', sku: S, warehouse: W, qty: 4, at: T(6), ttlMs: TTL })
  assert.equal(reserved.status, 'reserved')
  assert.equal(reserved.reservation.expiresAt, T(6, 30))
  assert.equal(allocator.held({ warehouse: W, sku: S, at: T(6, 29) }), 4)

  // no sweep job, no reconciliation call, no second reserve: the deadline alone
  // decides, and the next reader has to see the stock as free again.
  assert.equal(allocator.held({ warehouse: W, sku: S, at: T(6, 31) }), 0)

  allocator.addDemand({ orderId: 'o-2', sku: S, warehouse: W, qty: 10, priority: 1, placedAt: T(6) })
  const run = allocator.allocate({ at: T(7) })
  assert.equal(run.filled, 10)
  assert.equal(run.lines[0].status, 'allocated')
})

// interaction: liveness derived from the instant asked about, and the exclusive
// end of the window, both read back through the promise report.
test('the deadline is exclusive: at exactly expiresAt the hold has already lapsed', () => {
  const allocator = createAllocator()
  allocator.receive({ warehouse: W, sku: S, qty: 10, at: T(6) })
  const reserved = allocator.reserve({ orderId: 'o-1', sku: S, warehouse: W, qty: 4, at: T(6), ttlMs: TTL })
  assert.equal(reserved.reservation.expiresAt, T(6, 30))

  assert.equal(allocator.held({ warehouse: W, sku: S, at: T(6, 29, 59) }), 4)
  assert.equal(allocator.held({ warehouse: W, sku: S, at: T(6, 30) }), 0)

  const atp = allocator.atp({ sku: S, warehouse: W, at: T(6, 30) })
  assert.equal(atp.held, 0)
  assert.equal(atp.available, 10)
})

test('releasing a hold nobody knows is an ordinary answer, not an exception', () => {
  const allocator = createAllocator()
  allocator.receive({ warehouse: W, sku: S, qty: 6, at: T(6) })

  const result = allocator.release('rs-9999', { at: T(6, 5) })
  assert.equal(result.status, 'unknown')
  assert.equal(result.released, 0)
  assert.equal(allocator.onHand(W, S), 6)
  assert.equal(allocator.held({ warehouse: W, sku: S, at: T(6, 5) }), 0)

  const twice = allocator.release('rs-9999', { at: T(6, 6) })
  assert.equal(twice.status, 'unknown')
})

// interaction: a hold that lapsed and is then handed back explicitly - the
// release path has to agree with the deadline, and must not credit twice.
test('a hold whose deadline has passed cannot be given back as if it were still holding', () => {
  const allocator = createAllocator()
  allocator.receive({ warehouse: W, sku: S, qty: 10, at: T(6) })
  const reserved = allocator.reserve({ orderId: 'o-1', sku: S, warehouse: W, qty: 4, at: T(6), ttlMs: TTL })
  const before = allocator.release(reserved.reservation.id, { at: T(6, 29) })
  assert.equal(before.status, 'released')
  assert.equal(before.released, 4)
  assert.equal(allocator.held({ warehouse: W, sku: S, at: T(6, 29) }), 0)

  const second = allocator.reserve({ orderId: 'o-2', sku: S, warehouse: W, qty: 4, at: T(6, 29, 30), ttlMs: TTL })
  assert.equal(second.status, 'reserved')
  assert.equal(second.reservation.expiresAt, T(6, 59, 30))

  const late = allocator.release(second.reservation.id, { at: T(7, 0) })
  assert.equal(late.status, 'not-active')
  assert.equal(late.released, 0)
  assert.equal(allocator.held({ warehouse: W, sku: S, at: T(7, 0) }), 0)
  assert.equal(allocator.atp({ sku: S, warehouse: W, at: T(7, 0) }).available, 10)
})
