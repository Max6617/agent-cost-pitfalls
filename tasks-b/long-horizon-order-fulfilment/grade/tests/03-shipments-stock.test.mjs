// Sub-problem 3: shipments are capped by what the shelf actually holds, and
// the shortage stays backordered (docs/fulfilment-rules.md section 3).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const ev = (id, at, order, type, extra = {}) => ({ id, at, order, type, ...extra })
const at = (m) => `2024-03-12T14:${String(m).padStart(2, '0')}:00Z`

const packed = (svc, order, qty, price, base = 0) => {
  svc.applyAll([
    ev(`e-${order}-cr`, at(1 + base), order, 'created', { items: [{ sku: 'WIDGET', qty, price }] }),
    ev(`e-${order}-pa`, at(2 + base), order, 'paid'),
    ev(`e-${order}-pi`, at(3 + base), order, 'pick'),
    ev(`e-${order}-pk`, at(4 + base), order, 'pack'),
  ])
}

test('a ship event moves at most what is on hand', () => {
  const svc = createService({ stock: { WIDGET: 1 } })
  packed(svc, 'o-1', 2, 100)
  const result = svc.apply(ev('e-sh', at(5), 'o-1', 'ship', { sku: 'WIDGET', qty: 2 }))
  assert.equal(result.status, 'applied')
  const state = svc.state('o-1')
  assert.equal(state.items.WIDGET.shipped, 1)
  assert.equal(state.items.WIDGET.backordered, 1)
  assert.equal(state.status, 'partially-shipped')
  const report = svc.report()
  assert.deepEqual(report.onHand, {})
  assert.deepEqual(report.shipped, { WIDGET: 1 })
})

test('with an empty shelf a ship moves nothing but stays on the log', () => {
  const svc = createService({ stock: { WIDGET: 0 } })
  packed(svc, 'o-2', 1, 100)
  const result = svc.apply(ev('e-sh', at(5), 'o-2', 'ship', { sku: 'WIDGET', qty: 1 }))
  assert.equal(result.status, 'applied')
  const state = svc.state('o-2')
  assert.equal(state.items.WIDGET.shipped, 0)
  assert.equal(state.items.WIDGET.backordered, 1)
  assert.equal(state.status, 'packed')
  const report = svc.report()
  assert.equal(report.events, 5)
  assert.deepEqual(report.shipped, {})
})

test('scarce stock goes to the canonically earlier ship, not the one recorded first', () => {
  const svc = createService({ stock: { WIDGET: 2 } })
  packed(svc, 'o-3', 2, 100, 0)
  packed(svc, 'o-4', 2, 100, 4)
  // o-4's ship is recorded first, but o-3's ship happened earlier
  svc.apply(ev('e-sh-late', at(10), 'o-4', 'ship', { sku: 'WIDGET', qty: 2 }))
  svc.apply(ev('e-sh-early', at(9), 'o-3', 'ship', { sku: 'WIDGET', qty: 2 }))
  assert.equal(svc.state('o-3').status, 'shipped')
  const loser = svc.state('o-4')
  assert.equal(loser.items.WIDGET.shipped, 0)
  assert.equal(loser.items.WIDGET.backordered, 2)
  const report = svc.report()
  assert.deepEqual(report.onHand, {})
  assert.deepEqual(report.backordered, { WIDGET: 2 })
})

test('a restocked return lets a backordered shipment complete', () => {
  const svc = createService({ stock: { WIDGET: 1 } })
  packed(svc, 'o-5', 1, 300, 0)
  svc.apply(ev('e-sh-1', at(5), 'o-5', 'ship', { sku: 'WIDGET', qty: 1 }))
  packed(svc, 'o-6', 1, 300, 5)
  svc.apply(ev('e-sh-2', at(10), 'o-6', 'ship', { sku: 'WIDGET', qty: 1 }))
  assert.equal(svc.state('o-6').items.WIDGET.backordered, 1)
  assert.equal(svc.state('o-6').status, 'packed')

  svc.apply(ev('e-rt-1', at(11), 'o-5', 'return', { sku: 'WIDGET', qty: 1, condition: 'resalable' }))
  assert.deepEqual(svc.report().onHand, { WIDGET: 1 })

  const retry = svc.apply(ev('e-sh-3', at(12), 'o-6', 'ship', { sku: 'WIDGET', qty: 1 }))
  assert.equal(retry.status, 'applied')
  const state = svc.state('o-6')
  assert.equal(state.items.WIDGET.shipped, 1)
  assert.equal(state.status, 'shipped')
  assert.deepEqual(svc.report().onHand, {})
})
