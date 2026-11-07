import test from 'node:test'
import assert from 'node:assert/strict'
import { createShipments } from '../src/index.js'

test('an illegal move raises the documented error', () => {
  const shipments = createShipments()
  shipments.add({ id: 'h-1' })
  assert.throws(
    () => shipments.transition('h-1', 'resolved'),
    (err) => err.name === 'IllegalTransitionError' && err.code === 'illegal-transition',
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
