import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const ev = (id, at, order, type, extra = {}) => ({ id, at, order, type, ...extra })
const at = (m) => `2024-03-01T09:${String(m).padStart(2, '0')}:00Z`

const packedOrder = (svc, order, qty, price, base = 0) => {
  svc.applyAll([
    ev(`e-${order}-1`, at(1 + base), order, 'created', { items: [{ sku: 'WIDGET', qty, price }] }),
    ev(`e-${order}-2`, at(2 + base), order, 'paid'),
    ev(`e-${order}-3`, at(3 + base), order, 'pick'),
    ev(`e-${order}-4`, at(4 + base), order, 'pack'),
  ])
}

test('a redelivered event with a fresh timestamp is still a duplicate', () => {
  const svc = createService({ stock: { WIDGET: 10 } })
  packedOrder(svc, 'o-1', 3, 100)
  svc.apply(ev('e-sh-1', at(5), 'o-1', 'ship', { sku: 'WIDGET', qty: 2 }))
  const again = svc.apply(ev('e-sh-1', at(9), 'o-1', 'ship', { sku: 'WIDGET', qty: 2 }))
  assert.equal(again.status, 'duplicate')
  assert.equal(svc.state('o-1').items.WIDGET.shipped, 2)
  assert.deepEqual(svc.report().onHand, { WIDGET: 8 })
})

test('a shipment cannot move more units than the warehouse holds', () => {
  const svc = createService({ stock: { WIDGET: 1 } })
  packedOrder(svc, 'o-2', 2, 100)
  svc.apply(ev('e-sh-1', at(5), 'o-2', 'ship', { sku: 'WIDGET', qty: 2 }))
  const state = svc.state('o-2')
  assert.equal(state.items.WIDGET.shipped, 1)
  assert.equal(state.items.WIDGET.backordered, 1)
  assert.equal(state.status, 'partially-shipped')
  assert.deepEqual(svc.report().onHand, {})
})

test('cancelling after the goods have shipped opens a return flow, not a refund', () => {
  const svc = createService({ stock: { WIDGET: 5 } })
  packedOrder(svc, 'o-3', 2, 500)
  svc.apply(ev('e-sh-1', at(5), 'o-3', 'ship', { sku: 'WIDGET', qty: 2 }))
  const result = svc.apply(ev('e-cx-1', at(6), 'o-3', 'cancel'))
  assert.equal(result.status, 'applied-as-return')
  const state = svc.state('o-3')
  assert.equal(state.status, 'return-open')
  assert.equal(state.refunded, 0)
})

test('a damaged return is refunded but never goes back on the shelf', () => {
  const svc = createService({ stock: { WIDGET: 3 } })
  packedOrder(svc, 'o-4', 2, 500)
  svc.apply(ev('e-sh-1', at(5), 'o-4', 'ship', { sku: 'WIDGET', qty: 2 }))
  const result = svc.apply(ev('e-rt-1', at(6), 'o-4', 'return', { sku: 'WIDGET', qty: 1, condition: 'damaged' }))
  assert.equal(result.status, 'applied')
  assert.equal(svc.state('o-4').refunded, 500)
  assert.deepEqual(svc.report().onHand, { WIDGET: 1 })
})

test('a report prefix follows the canonical log, not the arrival order', () => {
  const svc = createService()
  svc.applyAll([
    ev('e-a-1', at(1), 'o-a', 'created', { items: [{ sku: 'WIDGET', qty: 1, price: 300 }] }),
    ev('e-b-1', at(3), 'o-b', 'created', { items: [{ sku: 'WIDGET', qty: 1, price: 900 }] }),
    ev('e-b-2', at(4), 'o-b', 'paid'),
    ev('e-a-2', at(2), 'o-a', 'paid'),
  ])
  const report = svc.report({ through: 2 })
  assert.equal(report.events, 2)
  assert.equal(report.money.collected, 300)
})
