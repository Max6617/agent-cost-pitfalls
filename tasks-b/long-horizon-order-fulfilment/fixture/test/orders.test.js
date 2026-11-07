import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const ev = (id, at, order, type, extra = {}) => ({ id, at, order, type, ...extra })
const at = (m) => `2024-03-01T09:${String(m).padStart(2, '0')}:00Z`

test('an order goes created to delivered, collecting its value', () => {
  const svc = createService({ stock: { WIDGET: 5 } })
  const results = svc.applyAll([
    ev('e-1', at(1), 'o-1', 'created', { items: [{ sku: 'WIDGET', qty: 2, price: 500 }] }),
    ev('e-2', at(2), 'o-1', 'paid'),
    ev('e-3', at(3), 'o-1', 'pick'),
    ev('e-4', at(4), 'o-1', 'pack'),
    ev('e-5', at(5), 'o-1', 'ship', { sku: 'WIDGET', qty: 2 }),
    ev('e-6', at(6), 'o-1', 'deliver'),
  ])
  assert.deepEqual(results.map((r) => r.status), ['applied', 'applied', 'applied', 'applied', 'applied', 'applied'])
  assert.equal(svc.state('o-1').status, 'delivered')
  const report = svc.report()
  assert.deepEqual(report.money, { collected: 1000, refunded: 0, net: 1000 })
  assert.deepEqual(report.onHand, { WIDGET: 3 })
})

test('a shipment before packing is refused and the order can still proceed', () => {
  const svc = createService({ stock: { WIDGET: 2 } })
  svc.applyAll([
    ev('e-1', at(1), 'o-2', 'created', { items: [{ sku: 'WIDGET', qty: 1, price: 100 }] }),
    ev('e-2', at(2), 'o-2', 'paid'),
    ev('e-3', at(3), 'o-2', 'pick'),
  ])
  const early = svc.apply(ev('e-4', at(4), 'o-2', 'ship', { sku: 'WIDGET', qty: 1 }))
  assert.equal(early.status, 'out-of-sequence')
  svc.apply(ev('e-5', at(5), 'o-2', 'pack'))
  const late = svc.apply(ev('e-6', at(6), 'o-2', 'ship', { sku: 'WIDGET', qty: 1 }))
  assert.equal(late.status, 'applied')
  assert.equal(svc.state('o-2').status, 'shipped')
})

test('an order can ship in more than one consignment', () => {
  const svc = createService({ stock: { WIDGET: 5 } })
  svc.applyAll([
    ev('e-1', at(1), 'o-3', 'created', { items: [{ sku: 'WIDGET', qty: 3, price: 100 }] }),
    ev('e-2', at(2), 'o-3', 'paid'),
    ev('e-3', at(3), 'o-3', 'pick'),
    ev('e-4', at(4), 'o-3', 'pack'),
  ])
  svc.apply(ev('e-5', at(5), 'o-3', 'ship', { sku: 'WIDGET', qty: 1 }))
  assert.equal(svc.state('o-3').status, 'partially-shipped')
  assert.equal(svc.state('o-3').items.WIDGET.backordered, 2)
  svc.apply(ev('e-6', at(6), 'o-3', 'ship', { sku: 'WIDGET', qty: 2 }))
  assert.equal(svc.state('o-3').status, 'shipped')
  assert.equal(svc.state('o-3').items.WIDGET.backordered, 0)
})

test('cancelling before anything ships refunds the payment in full', () => {
  const svc = createService({ stock: { WIDGET: 5 } })
  svc.applyAll([
    ev('e-1', at(1), 'o-4', 'created', { items: [{ sku: 'WIDGET', qty: 2, price: 500 }] }),
    ev('e-2', at(2), 'o-4', 'paid'),
  ])
  const cancelled = svc.apply(ev('e-3', at(3), 'o-4', 'cancel'))
  assert.equal(cancelled.status, 'applied')
  const state = svc.state('o-4')
  assert.equal(state.status, 'cancelled')
  assert.equal(state.refunded, 1000)
  const after = svc.apply(ev('e-4', at(4), 'o-4', 'pick'))
  assert.equal(after.status, 'out-of-sequence')
})

test('packing before picking is refused', () => {
  const svc = createService({ stock: { WIDGET: 1 } })
  svc.applyAll([
    ev('e-1', at(1), 'o-5', 'created', { items: [{ sku: 'WIDGET', qty: 1, price: 100 }] }),
    ev('e-2', at(2), 'o-5', 'paid'),
  ])
  const early = svc.apply(ev('e-3', at(3), 'o-5', 'pack'))
  assert.equal(early.status, 'out-of-sequence')
})
