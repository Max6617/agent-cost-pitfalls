import test from 'node:test'
import assert from 'node:assert/strict'
import { createSupportDesk } from '../src/index.js'

test('tickets from the same address in different case share a thread', () => {
  const desk = createSupportDesk()
  const first = desk.openTicket({ email: 'Mary@Gmail.com', subject: 'refund' })
  const second = desk.openTicket({ email: 'mary@gmail.com', subject: 'refund again' })
  assert.equal(first.ticket.threadId, second.ticket.threadId)
  assert.equal(desk.threadCount(), 1)
})

test('two tickets from the identical address share a thread', () => {
  const desk = createSupportDesk()
  const first = desk.openTicket({ email: 'kim@example.com', subject: 'a' })
  const second = desk.openTicket({ email: 'kim@example.com', subject: 'b' })
  assert.equal(first.ticket.threadId, second.ticket.threadId)
  assert.equal(desk.threadCount(), 1)
})
