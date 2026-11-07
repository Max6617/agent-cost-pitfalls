// Sub-problem 4: every return refunds; only some conditions restock
// (docs/fulfilment-rules.md section 5).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const ev = (id, at, order, type, extra = {}) => ({ id, at, order, type, ...extra })
const at = (m) => `2024-03-13T10:${String(m).padStart(2, '0')}:00Z`

const packedAndShipped = (svc, order, qty, price) => {
  svc.applyAll([
    ev(`e-${order}-cr`, at(1), order, 'created', { items: [{ sku: 'WIDGET', qty, price }] }),
    ev(`e-${order}-pa`, at(2), order, 'paid'),
    ev(`e-${order}-pi`, at(3), order, 'pick'),
    ev(`e-${order}-pk`, at(4), order, 'pack'),
    ev(`e-${order}-sh`, at(5), order, 'ship', { sku: 'WIDGET', qty }),
  ])
}

test('a damaged unit is refunded and written off', () => {
  const svc = createService({ stock: { WIDGET: 2 } })
  packedAndShipped(svc, 'o-1', 2, 450)
  const result = svc.apply(ev('e-rt', at(6), 'o-1', 'return', { sku: 'WIDGET', qty: 1, condition: 'damaged' }))
  assert.equal(result.status, 'applied')
  const state = svc.state('o-1')
  assert.equal(state.refunded, 450)
  assert.equal(state.items.WIDGET.returned, 1)
  assert.deepEqual(svc.report().onHand, {})
})

test('an unopened unit goes back on the shelf', () => {
  const svc = createService({ stock: { WIDGET: 3 } })
  packedAndShipped(svc, 'o-2', 2, 450)
  const result = svc.apply(ev('e-rt', at(6), 'o-2', 'return', { sku: 'WIDGET', qty: 1, condition: 'unopened' }))
  assert.equal(result.status, 'applied')
  const state = svc.state('o-2')
  assert.equal(state.refunded, 450)
  assert.equal(state.items.WIDGET.returned, 1)
  assert.equal(state.status, 'shipped')
  assert.deepEqual(svc.report().onHand, { WIDGET: 2 })
})

test('a written-off unit does not revive another order\'s backorder', () => {
  const svc = createService({ stock: { WIDGET: 1 } })
  packedAndShipped(svc, 'o-3', 1, 200)
  svc.applyAll([
    ev('e-cr-4', at(6), 'o-4', 'created', { items: [{ sku: 'WIDGET', qty: 1, price: 200 }] }),
    ev('e-pa-4', at(7), 'o-4', 'paid'),
    ev('e-pi-4', at(8), 'o-4', 'pick'),
    ev('e-pk-4', at(9), 'o-4', 'pack'),
    ev('e-sh-4', at(10), 'o-4', 'ship', { sku: 'WIDGET', qty: 1 }),
  ])
  assert.equal(svc.state('o-4').items.WIDGET.backordered, 1)

  svc.apply(ev('e-rt-3', at(11), 'o-3', 'return', { sku: 'WIDGET', qty: 1, condition: 'defective' }))
  assert.equal(svc.state('o-3').refunded, 200)
  assert.deepEqual(svc.report().onHand, {})

  const retry = svc.apply(ev('e-sh-5', at(12), 'o-4', 'ship', { sku: 'WIDGET', qty: 1 }))
  assert.equal(retry.status, 'applied')
  const state = svc.state('o-4')
  assert.equal(state.items.WIDGET.shipped, 0)
  assert.equal(state.items.WIDGET.backordered, 1)
})

test('returning more than is still out there is over-quantity and changes nothing', () => {
  const svc = createService({ stock: { WIDGET: 3 } })
  packedAndShipped(svc, 'o-5', 2, 300)
  svc.apply(ev('e-cx', at(6), 'o-5', 'cancel'))
  const tooMany = svc.apply(ev('e-rt', at(7), 'o-5', 'return', { sku: 'WIDGET', qty: 3, condition: 'unopened' }))
  assert.equal(tooMany.status, 'over-quantity')
  const state = svc.state('o-5')
  assert.equal(state.items.WIDGET.returned, 0)
  assert.equal(state.refunded, 0)
  assert.equal(state.status, 'return-open')
  assert.deepEqual(svc.report().onHand, { WIDGET: 1 })
})
