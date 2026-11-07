// Sub-problem: the shipments board follows the documented transition contract.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createShipments } from '../src/index.js'

test('an illegal transition raises the documented error', () => {
  const shipments = createShipments()
  shipments.add({ id: 'h-1' })
  assert.throws(
    () => shipments.transition('h-1', 'resolved'),
    (err) => {
      assert.equal(err.name, 'IllegalTransitionError')
      assert.equal(err.code, 'illegal-transition')
      assert.equal(err.from, 'open')
      assert.equal(err.to, 'resolved')
      return true
    },
  )
  assert.equal(shipments.get('h-1').status, 'open')
})

test('a held shipment can resume', () => {
  const shipments = createShipments()
  shipments.add({ id: 'h-1' })
  shipments.transition('h-1', 'triaged')
  shipments.transition('h-1', 'on-hold')
  shipments.transition('h-1', 'in-progress')
  assert.equal(shipments.get('h-1').status, 'in-progress')
})

test('the error carries the canonical target even when a legacy spelling was used', () => {
  const shipments = createShipments()
  shipments.add({ id: 'h-1' })
  assert.throws(
    () => shipments.transition('h-1', 'done'),
    (err) => {
      assert.equal(err.code, 'illegal-transition')
      assert.equal(err.from, 'open')
      assert.equal(err.to, 'resolved')
      return true
    },
  )
})

test('an unknown target spelling is refused as unknown, not illegal', () => {
  const shipments = createShipments()
  shipments.add({ id: 'h-1' })
  assert.throws(
    () => shipments.transition('h-1', 'bogus'),
    (err) => err.code === 'unknown-status',
  )
})
