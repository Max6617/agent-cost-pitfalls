import test from 'node:test'
import assert from 'node:assert/strict'
import { createService, overlaps } from '../src/index.js'

test('intervals that merely touch do not overlap', () => {
  assert.equal(overlaps(540, 600, 600, 660), false)
  assert.equal(overlaps(600, 660, 540, 600), false)
})

test('back-to-back bookings are fine in a room that needs no turnaround', () => {
  const svc = createService({ rooms: [{ id: 'booth', type: 'phone-booth', capacity: 2 }] })
  const first = svc.book({ id: 'b-1', room: 'booth', start: 540, end: 600, attendees: 1 })
  assert.equal(first.status, 'booked')
  const second = svc.book({ id: 'b-2', room: 'booth', start: 600, end: 660, attendees: 1 })
  assert.equal(second.status, 'booked')
})
