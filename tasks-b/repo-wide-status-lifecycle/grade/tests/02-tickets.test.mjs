// Sub-problem: the ticket flow follows the documented transition map.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createTickets } from '../src/index.js'

test('a ticket cannot jump from open straight to resolved', () => {
  const tickets = createTickets()
  tickets.add({ id: 't-1' })
  assert.throws(
    () => tickets.transition('t-1', 'resolved'),
    (err) => {
      assert.equal(err.name, 'IllegalTransitionError')
      assert.equal(err.code, 'illegal-transition')
      return true
    },
  )
  assert.equal(tickets.get('t-1').status, 'open')
})

test('a cancelled ticket is final', () => {
  const tickets = createTickets()
  tickets.add({ id: 't-1', status: 'void' })
  assert.equal(tickets.get('t-1').status, 'cancelled')
  assert.throws(
    () => tickets.transition('t-1', 'open'),
    (err) => err.code === 'illegal-transition',
  )
  assert.equal(tickets.get('t-1').status, 'cancelled')
})

test('a resolved ticket can be reopened', () => {
  const tickets = createTickets()
  tickets.add({ id: 't-1', status: 'done' })
  tickets.transition('t-1', 'reopened')
  assert.equal(tickets.get('t-1').status, 'reopened')
  tickets.transition('t-1', 'in-progress')
  assert.equal(tickets.get('t-1').status, 'in-progress')
})

test('a transition target may use a legacy spelling', () => {
  const tickets = createTickets()
  tickets.add({ id: 't-1', status: 'new' })
  tickets.transition('t-1', 'assessed')
  assert.equal(tickets.get('t-1').status, 'triaged')
})
