// Sub-problem 3: the safety stock each channel keeps back.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAllocator } from '../src/index.js'

const T = (h, m = 0) =>
  '2024-05-01T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00.000Z'
const W = 'north'
const SOUTH = 'south'
const S = 'SKU-BOLT-6'
// a day-long hold, so nothing in this file turns on a deadline
const engine = () => createAllocator({ defaultTtlMs: 24 * 60 * 60 * 1000 })

const added = (run) => Object.fromEntries(run.lines.map((line) => [line.orderId, line.added]))

// interaction: one shelf, two channels, and the order the pass serves them in -
// each line has to be measured against its own channel's buffer.
test('a pass serves the queue in order and measures each line against its own channel', () => {
  const allocator = engine()
  allocator.receive({ warehouse: W, sku: S, qty: 30, at: T(6) })
  allocator.setBuffer({ channel: 'web', sku: S, warehouse: W, qty: 10 })
  allocator.setBuffer({ channel: 'trade', sku: S, warehouse: W, qty: 4 })

  allocator.addDemand({ orderId: 'o-trade', sku: S, warehouse: W, qty: 24, priority: 2, channel: 'trade', placedAt: T(6) })
  allocator.addDemand({ orderId: 'o-web', sku: S, warehouse: W, qty: 25, priority: 1, channel: 'web', placedAt: T(6, 5) })

  const run = allocator.allocate({ at: T(7) })
  assert.equal(run.lines[0].orderId, 'o-web')
  // web: 30 on hand, 10 kept back -> 20. trade: 30 - 20 already promised - 4 -> 6.
  assert.deepEqual(added(run), { 'o-web': 20, 'o-trade': 6 })
  assert.equal(run.filled, 26)
  assert.equal(allocator.held({ warehouse: W, sku: S, at: T(7) }), 26)
  assert.deepEqual(
    allocator.backorders().map((line) => [line.orderId, line.outstanding]),
    [['o-web', 5], ['o-trade', 18]],
  )
})

test('a buffer belongs to one shelf: another warehouse keeps its own number', () => {
  const allocator = engine()
  allocator.receive({ warehouse: W, sku: S, qty: 20, at: T(6) })
  allocator.receive({ warehouse: SOUTH, sku: S, qty: 20, at: T(6) })
  allocator.setBuffer({ channel: 'web', sku: S, warehouse: W, qty: 10 })

  assert.equal(allocator.bufferFor({ channel: 'web', sku: S, warehouse: W }), 10)
  assert.equal(allocator.bufferFor({ channel: 'web', sku: S, warehouse: SOUTH }), 0)

  allocator.addDemand({ orderId: 'o-1', sku: S, warehouse: SOUTH, qty: 20, priority: 1, channel: 'web', placedAt: T(6) })
  const run = allocator.allocate({ at: T(7) })
  assert.deepEqual(added(run), { 'o-1': 20 })
})

test('a channel nobody buffered does not spend another channel\'s safety stock', () => {
  const allocator = engine()
  allocator.receive({ warehouse: W, sku: S, qty: 20, at: T(6) })
  allocator.setBuffer({ channel: 'web', sku: S, warehouse: W, qty: 10 })

  allocator.addDemand({ orderId: 'o-1', sku: S, warehouse: W, qty: 20, priority: 1, channel: 'trade', placedAt: T(6) })
  const run = allocator.allocate({ at: T(7) })
  assert.deepEqual(added(run), { 'o-1': 20 })
  assert.equal(run.lines[0].status, 'allocated')
})

// interaction: the buffer bound to a direct reservation as well, including what
// the refusal reports and what a caller may do with allowBuffer.
test('the buffer binds a direct reservation too, and allowBuffer is the way through it', () => {
  const allocator = engine()
  allocator.receive({ warehouse: W, sku: S, qty: 10, at: T(6) })
  allocator.setBuffer({ channel: 'trade', sku: S, warehouse: W, qty: 4 })
  allocator.setBuffer({ channel: 'web', sku: S, warehouse: W, qty: 10 })

  const refused = allocator.reserve({ orderId: 'o-1', sku: S, warehouse: W, qty: 8, channel: 'trade', at: T(7) })
  assert.equal(refused.status, 'insufficient')
  assert.equal(refused.available, 6)

  const taken = allocator.reserve({ orderId: 'o-1', sku: S, warehouse: W, qty: 6, channel: 'trade', at: T(7) })
  assert.equal(taken.status, 'reserved')
  assert.equal(allocator.held({ warehouse: W, sku: S, at: T(7) }), 6)

  const spent = allocator.reserve({ orderId: 'o-2', sku: S, warehouse: W, qty: 4, channel: 'trade', at: T(7), allowBuffer: true })
  assert.equal(spent.status, 'reserved')
  assert.equal(allocator.held({ warehouse: W, sku: S, at: T(7) }), 10)
})
