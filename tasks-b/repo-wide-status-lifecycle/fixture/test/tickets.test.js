import test from 'node:test'
import assert from 'node:assert/strict'
import { createTickets } from '../src/index.js'

test('a closed ticket can only come back through reopened', () => {
  const tickets = createTickets()
  tickets.add({ id: 't-1', status: 'shut' })
  assert.throws(
    () => tickets.transition('t-1', 'open'),
    (err) => err.code === 'illegal-transition',
  )
  assert.equal(tickets.get('t-1').status, 'closed')
})

test('a cancelled ticket is final', () => {
  const tickets = createTickets()
  tickets.add({ id: 't-1', status: 'void' })
  assert.equal(tickets.get('t-1').status, 'cancelled')
  assert.throws(
    () => tickets.transition('t-1', 'open'),
    (err) => err.code === 'illegal-transition',
  )
})
