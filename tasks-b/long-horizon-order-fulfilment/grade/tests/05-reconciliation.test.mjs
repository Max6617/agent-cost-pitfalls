// Sub-problem 5: the reconciliation report reads the canonical log, including
// its prefixes (docs/fulfilment-rules.md sections 1 and 7).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const ev = (id, at, order, type, extra = {}) => ({ id, at, order, type, ...extra })
const at = (m) => `2024-03-14T16:${String(m).padStart(2, '0')}:00Z`

test('a prefix is counted along the canonical order, not the arrival order', () => {
  const svc = createService()
  svc.applyAll([
    ev('e-a-1', at(1), 'o-a', 'created', { items: [{ sku: 'WIDGET', qty: 1, price: 300 }] }),
    ev('e-b-1', at(3), 'o-b', 'created', { items: [{ sku: 'WIDGET', qty: 1, price: 900 }] }),
    ev('e-b-2', at(4), 'o-b', 'paid'),
    ev('e-a-2', at(2), 'o-a', 'paid'),
  ])
  const firstTwo = svc.report({ through: 2 })
  assert.equal(firstTwo.events, 2)
  assert.equal(firstTwo.money.collected, 300)
  const whole = svc.report({ through: 4 })
  assert.equal(whole.money.collected, 1200)
})

test('the report does not depend on the order the events arrived in', () => {
  const events = [
    ev('e-1', at(1), 'o-1', 'created', { items: [{ sku: 'WIDGET', qty: 2, price: 250 }] }),
    ev('e-2', at(2), 'o-1', 'paid'),
    ev('e-3', at(3), 'o-1', 'pick'),
    ev('e-4', at(4), 'o-1', 'pack'),
    ev('e-5', at(5), 'o-1', 'ship', { sku: 'WIDGET', qty: 2 }),
  ]
  const inOrder = createService({ stock: { WIDGET: 10 } })
  inOrder.applyAll(events)
  const scrambled = createService({ stock: { WIDGET: 10 } })
  scrambled.applyAll([events[4], events[3], events[0], events[1], events[2]])
  assert.deepEqual(scrambled.report(), inOrder.report())
  assert.deepEqual(inOrder.report().onHand, { WIDGET: 8 })
  assert.deepEqual(inOrder.report().money, { collected: 500, refunded: 0, net: 500 })
})

test('money accumulates step by step along canonical prefixes', () => {
  const svc = createService()
  svc.applyAll([
    ev('e-1c', at(5), 'o-3', 'created', { items: [{ sku: 'WIDGET', qty: 1, price: 400 }] }),
    ev('e-1p', at(6), 'o-3', 'paid'),
    ev('e-2c', at(3), 'o-2', 'created', { items: [{ sku: 'WIDGET', qty: 1, price: 200 }] }),
    ev('e-2p', at(4), 'o-2', 'paid'),
    ev('e-3c', at(1), 'o-1', 'created', { items: [{ sku: 'WIDGET', qty: 1, price: 100 }] }),
    ev('e-3p', at(2), 'o-1', 'paid'),
  ])
  assert.equal(svc.report({ through: 2 }).money.collected, 100)
  assert.equal(svc.report({ through: 2 }).events, 2)
  assert.equal(svc.report({ through: 4 }).money.collected, 300)
  assert.equal(svc.report({ through: 4 }).events, 4)
  assert.equal(svc.report({ through: 6 }).money.collected, 700)
})

test('a cancel that became a return flow moves no money in the report', () => {
  const svc = createService({ stock: { WIDGET: 4 } })
  svc.applyAll([
    ev('e-1', at(1), 'o-1', 'created', { items: [{ sku: 'WIDGET', qty: 2, price: 600 }] }),
    ev('e-2', at(2), 'o-1', 'paid'),
    ev('e-3', at(3), 'o-1', 'pick'),
    ev('e-4', at(4), 'o-1', 'pack'),
    ev('e-5', at(5), 'o-1', 'ship', { sku: 'WIDGET', qty: 2 }),
  ])
  const result = svc.apply(ev('e-6', at(6), 'o-1', 'cancel'))
  assert.equal(result.status, 'applied-as-return')
  const report = svc.report()
  assert.deepEqual(report.money, { collected: 1200, refunded: 0, net: 1200 })
  assert.equal(report.events, 6)
})

test('the report shows the backordered units a short shelf could not ship', () => {
  const svc = createService({ stock: { WIDGET: 3 } })
  svc.applyAll([
    ev('e-1', at(1), 'o-1', 'created', { items: [{ sku: 'WIDGET', qty: 5, price: 100 }] }),
    ev('e-2', at(2), 'o-1', 'paid'),
    ev('e-3', at(3), 'o-1', 'pick'),
    ev('e-4', at(4), 'o-1', 'pack'),
    ev('e-5', at(5), 'o-1', 'ship', { sku: 'WIDGET', qty: 5 }),
  ])
  const report = svc.report()
  assert.equal(report.events, 5)
  assert.deepEqual(report.onHand, {})
  assert.deepEqual(report.shipped, { WIDGET: 3 })
  assert.deepEqual(report.backordered, { WIDGET: 2 })
  assert.equal(report.money.net, 500)
})
