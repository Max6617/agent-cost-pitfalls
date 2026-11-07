// Interactions: the boards and the rollup only agree when every board speaks
// the same canonical vocabulary.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createOrders, createTickets, createSubscriptions, createShipments, summarise } from '../src/index.js'

test('the weekly rollup sees one vocabulary across boards', () => {
  const orders = createOrders()
  const shipments = createShipments()
  const tickets = createTickets()
  orders.add({ id: 'o-1', status: 'dispatched' })
  shipments.add({ id: 'h-1', status: 'in-progress' })
  tickets.add({ id: 't-1', status: 'new' })
  const statuses = [...orders.all(), ...shipments.all(), ...tickets.all()].map((r) => r.status)
  const { counts, active, total } = summarise(statuses)
  assert.deepEqual(counts, { 'in-progress': 2, open: 1 })
  assert.equal(active, 3)
  assert.equal(total, 3)
})

test('a ticket can travel the whole reopened path on legacy spellings', () => {
  const tickets = createTickets()
  tickets.add({ id: 't-1', status: 'shut' })
  tickets.transition('t-1', 'reopen')
  assert.equal(tickets.get('t-1').status, 'reopened')
  tickets.transition('t-1', 'assessed')
  assert.equal(tickets.get('t-1').status, 'triaged')
})

test('every board ends up on the same status for the same journey', () => {
  const boards = [createOrders(), createTickets(), createSubscriptions(), createShipments()]
  for (const b of boards) b.add({ id: 'r-1', status: 'new' })
  for (const b of boards) {
    b.transition('r-1', 'triaged')
    b.transition('r-1', 'in-progress')
    b.transition('r-1', 'done')
  }
  assert.deepEqual(boards.map((b) => b.get('r-1').status), ['resolved', 'resolved', 'resolved', 'resolved'])
})
