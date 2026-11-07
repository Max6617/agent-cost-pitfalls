// Sub-problem 4: the support desk threads by identity, however the customer
// typed their address this time — the raw string is display, not a key.
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

test('tag, dots and alias resolve to one thread', () => {
  const desk = createSupportDesk()
  desk.openTicket({ email: 'Sam.Ochoa+help@googlemail.com', subject: 'login' })
  const found = desk.ticketsFor('samochoa@gmail.com')
  assert.equal(found.length, 1)
  assert.equal(found[0].email, 'Sam.Ochoa+help@googlemail.com')
})

test('surrounding whitespace does not split a thread, and display is untouched', () => {
  const desk = createSupportDesk()
  const opened = desk.openTicket({ email: '  Kim@example.com  ', subject: 'hi' })
  assert.equal(opened.status, 'open')
  const found = desk.ticketsFor('kim@example.com')
  assert.equal(found.length, 1)
  assert.equal(found[0].email, '  Kim@example.com  ')
})

test('two tickets from the identical address share a thread', () => {
  const desk = createSupportDesk()
  const first = desk.openTicket({ email: 'kim@example.com', subject: 'a' })
  const second = desk.openTicket({ email: 'kim@example.com', subject: 'b' })
  assert.equal(first.ticket.threadId, second.ticket.threadId)
  assert.equal(desk.threadCount(), 1)
})
