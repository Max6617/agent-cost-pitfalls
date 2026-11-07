// Sub-problem 2: the legal sequence and the two faces of cancel
// (docs/fulfilment-rules.md sections 2 and 4).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const ev = (id, at, order, type, extra = {}) => ({ id, at, order, type, ...extra })
const at = (m) => `2024-03-11T08:${String(m).padStart(2, '0')}:00Z`

test('an order walks the whole happy path', () => {
  const svc = createService({ stock: { WIDGET: 4 } })
  const results = svc.applyAll([
    ev('e-1', at(1), 'o-1', 'created', { items: [{ sku: 'WIDGET', qty: 2, price: 250 }] }),
    ev('e-2', at(2), 'o-1', 'paid'),
    ev('e-3', at(3), 'o-1', 'pick'),
    ev('e-4', at(4), 'o-1', 'pack'),
    ev('e-5', at(5), 'o-1', 'ship', { sku: 'WIDGET', qty: 2 }),
    ev('e-6', at(6), 'o-1', 'deliver'),
  ])
  assert.deepEqual(results.map((r) => r.status), ['applied', 'applied', 'applied', 'applied', 'applied', 'applied'])
  assert.equal(svc.state('o-1').status, 'delivered')
  const report = svc.report()
  assert.deepEqual(report.money, { collected: 500, refunded: 0, net: 500 })
  assert.deepEqual(report.backordered, {})
})

test('shipping before packing is out of sequence', () => {
  const svc = createService({ stock: { WIDGET: 3 } })
  svc.applyAll([
    ev('e-1', at(1), 'o-2', 'created', { items: [{ sku: 'WIDGET', qty: 1, price: 100 }] }),
    ev('e-2', at(2), 'o-2', 'paid'),
    ev('e-3', at(3), 'o-2', 'pick'),
  ])
  const early = svc.apply(ev('e-4', at(4), 'o-2', 'ship', { sku: 'WIDGET', qty: 1 }))
  assert.equal(early.status, 'out-of-sequence')
  assert.equal(svc.state('o-2').items.WIDGET.shipped, 0)
  svc.apply(ev('e-5', at(5), 'o-2', 'pack'))
  const late = svc.apply(ev('e-6', at(6), 'o-2', 'ship', { sku: 'WIDGET', qty: 1 }))
  assert.equal(late.status, 'applied')
  assert.equal(svc.state('o-2').status, 'shipped')
})

test('cancelling before the first ship is a plain cancellation', () => {
  const paid = createService({ stock: { WIDGET: 5 } })
  paid.applyAll([
    ev('e-1', at(1), 'o-3', 'created', { items: [{ sku: 'WIDGET', qty: 2, price: 300 }] }),
    ev('e-2', at(2), 'o-3', 'paid'),
  ])
  const cancelled = paid.apply(ev('e-3', at(3), 'o-3', 'cancel'))
  assert.equal(cancelled.status, 'applied')
  assert.equal(paid.state('o-3').status, 'cancelled')
  assert.equal(paid.state('o-3').refunded, 600)
  assert.equal(paid.apply(ev('e-4', at(4), 'o-3', 'pick')).status, 'out-of-sequence')
  assert.equal(paid.apply(ev('e-5', at(5), 'o-3', 'return', { sku: 'WIDGET', qty: 1, condition: 'unopened' })).status, 'out-of-sequence')

  const unpaid = createService({ stock: { WIDGET: 5 } })
  unpaid.apply(ev('e-1', at(1), 'o-4', 'created', { items: [{ sku: 'WIDGET', qty: 1, price: 150 }] }))
  const gone = unpaid.apply(ev('e-2', at(2), 'o-4', 'cancel'))
  assert.equal(gone.status, 'applied')
  assert.equal(unpaid.state('o-4').status, 'cancelled')
  assert.equal(unpaid.state('o-4').refunded, 0)
})

test('cancelling after a partial shipment opens a return flow and the rest still ships', () => {
  const svc = createService({ stock: { WIDGET: 6 } })
  svc.applyAll([
    ev('e-1', at(1), 'o-5', 'created', { items: [{ sku: 'WIDGET', qty: 3, price: 300 }] }),
    ev('e-2', at(2), 'o-5', 'paid'),
    ev('e-3', at(3), 'o-5', 'pick'),
    ev('e-4', at(4), 'o-5', 'pack'),
    ev('e-5', at(5), 'o-5', 'ship', { sku: 'WIDGET', qty: 1 }),
  ])
  const result = svc.apply(ev('e-6', at(6), 'o-5', 'cancel'))
  assert.equal(result.status, 'applied-as-return')
  assert.equal(svc.state('o-5').status, 'return-open')
  assert.equal(svc.state('o-5').refunded, 0)

  const rest = svc.apply(ev('e-7', at(7), 'o-5', 'ship', { sku: 'WIDGET', qty: 2 }))
  assert.equal(rest.status, 'applied')
  const state = svc.state('o-5')
  assert.equal(state.items.WIDGET.shipped, 3)
  assert.equal(state.items.WIDGET.backordered, 0)
  assert.equal(state.status, 'return-open')
})

test('a return flow closes once everything shipped has come back', () => {
  const svc = createService({ stock: { WIDGET: 4 } })
  svc.applyAll([
    ev('e-1', at(1), 'o-6', 'created', { items: [{ sku: 'WIDGET', qty: 2, price: 600 }] }),
    ev('e-2', at(2), 'o-6', 'paid'),
    ev('e-3', at(3), 'o-6', 'pick'),
    ev('e-4', at(4), 'o-6', 'pack'),
    ev('e-5', at(5), 'o-6', 'ship', { sku: 'WIDGET', qty: 2 }),
  ])
  assert.equal(svc.apply(ev('e-6', at(6), 'o-6', 'cancel')).status, 'applied-as-return')
  const back = svc.apply(ev('e-7', at(7), 'o-6', 'return', { sku: 'WIDGET', qty: 2, condition: 'unopened' }))
  assert.equal(back.status, 'applied')
  const state = svc.state('o-6')
  assert.equal(state.status, 'closed')
  assert.equal(state.items.WIDGET.returned, 2)
  assert.equal(state.refunded, 1200)
  const report = svc.report()
  assert.deepEqual(report.onHand, { WIDGET: 4 })
  assert.equal(report.money.net, 0)
})
