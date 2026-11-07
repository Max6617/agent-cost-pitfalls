// Sub-problem 1: an event id applies once, ever - even when it comes back
// with a freshly stamped timestamp, and even when its first arrival was
// rejected (docs/fulfilment-rules.md section 6).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const ev = (id, at, order, type, extra = {}) => ({ id, at, order, type, ...extra })
const at = (m) => `2024-03-10T12:${String(m).padStart(2, '0')}:00Z`

const packed = (svc, order, qty, price, base = 0) => {
  svc.applyAll([
    ev(`e-${order}-cr`, at(1 + base), order, 'created', { items: [{ sku: 'WIDGET', qty, price }] }),
    ev(`e-${order}-pa`, at(2 + base), order, 'paid'),
    ev(`e-${order}-pi`, at(3 + base), order, 'pick'),
    ev(`e-${order}-pk`, at(4 + base), order, 'pack'),
  ])
}

test('a redelivered ship event with a new timestamp ships nothing twice', () => {
  const svc = createService({ stock: { WIDGET: 10 } })
  packed(svc, 'o-1', 3, 200)
  svc.apply(ev('e-sh-1', at(5), 'o-1', 'ship', { sku: 'WIDGET', qty: 2 }))
  const redelivery = svc.apply(ev('e-sh-1', at(7), 'o-1', 'ship', { sku: 'WIDGET', qty: 2 }))
  assert.equal(redelivery.status, 'duplicate')
  const state = svc.state('o-1')
  assert.equal(state.items.WIDGET.shipped, 2)
  assert.equal(state.items.WIDGET.backordered, 1)
  assert.deepEqual(svc.report().onHand, { WIDGET: 8 })
})

test('a redelivered return refunds once and restocks once', () => {
  const svc = createService({ stock: { WIDGET: 5 } })
  packed(svc, 'o-2', 2, 400)
  svc.apply(ev('e-sh-1', at(5), 'o-2', 'ship', { sku: 'WIDGET', qty: 2 }))
  svc.apply(ev('e-rt-1', at(6), 'o-2', 'return', { sku: 'WIDGET', qty: 1, condition: 'unopened' }))
  const redelivery = svc.apply(ev('e-rt-1', at(9), 'o-2', 'return', { sku: 'WIDGET', qty: 1, condition: 'unopened' }))
  assert.equal(redelivery.status, 'duplicate')
  const state = svc.state('o-2')
  assert.equal(state.items.WIDGET.returned, 1)
  assert.equal(state.refunded, 400)
  assert.deepEqual(svc.report().onHand, { WIDGET: 4 })
})

test('a rejected event still consumes its id; the retry uses a new one', () => {
  const svc = createService({ stock: { WIDGET: 2 } })
  svc.applyAll([
    ev('e-cr', at(1), 'o-3', 'created', { items: [{ sku: 'WIDGET', qty: 1, price: 100 }] }),
    ev('e-pa', at(2), 'o-3', 'paid'),
    ev('e-pi', at(3), 'o-3', 'pick'),
  ])
  const early = svc.apply(ev('e-sh-9', at(4), 'o-3', 'ship', { sku: 'WIDGET', qty: 1 }))
  assert.equal(early.status, 'out-of-sequence')
  svc.apply(ev('e-pk', at(5), 'o-3', 'pack'))
  const resent = svc.apply(ev('e-sh-9', at(6), 'o-3', 'ship', { sku: 'WIDGET', qty: 1 }))
  assert.equal(resent.status, 'duplicate')
  assert.equal(svc.state('o-3').items.WIDGET.shipped, 0)
  const retried = svc.apply(ev('e-sh-10', at(7), 'o-3', 'ship', { sku: 'WIDGET', qty: 1 }))
  assert.equal(retried.status, 'applied')
  assert.equal(svc.state('o-3').items.WIDGET.shipped, 1)
})

test('a redelivered created event does not split the order in two', () => {
  const svc = createService({ stock: { WIDGET: 9 } })
  svc.apply(ev('e-cr-1', at(1), 'o-4', 'created', { items: [{ sku: 'WIDGET', qty: 2, price: 500 }] }))
  const redelivery = svc.apply(ev('e-cr-1', at(8), 'o-4', 'created', { items: [{ sku: 'WIDGET', qty: 2, price: 500 }] }))
  assert.equal(redelivery.status, 'duplicate')
  assert.equal(svc.state('o-4').items.WIDGET.created, 2)
  svc.apply(ev('e-pa-1', at(9), 'o-4', 'paid'))
  assert.equal(svc.report().money.collected, 1000)
})

test('a duplicate inside a report prefix is counted once', () => {
  const svc = createService({ stock: { WIDGET: 5 } })
  packed(svc, 'o-5', 3, 100)
  svc.apply(ev('e-sh', at(5), 'o-5', 'ship', { sku: 'WIDGET', qty: 1 }))
  svc.apply(ev('e-sh', at(8), 'o-5', 'ship', { sku: 'WIDGET', qty: 1 }))
  const report = svc.report({ through: 6 })
  assert.equal(report.events, 6)
  assert.deepEqual(report.shipped, { WIDGET: 1 })
  assert.deepEqual(report.onHand, { WIDGET: 4 })
  assert.equal(report.money.collected, 300)
})
