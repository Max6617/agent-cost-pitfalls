// Sub-problem 2: the turnaround is owed on both sides of a booking.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const svc = () => createService({
  rooms: [
    { id: 'oak', type: 'lecture-hall', capacity: 20 },
    { id: 'ash', type: 'studio', capacity: 8 },
  ],
})

test('a booking that ends too close before the next one is refused', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 10 })
  const r = s.book({ id: 'b-2', room: 'oak', start: 545, end: 595, attendees: 10 })
  assert.equal(r.status, 'rejected')
  assert.equal(r.reason, 'turnaround')
  assert.equal(r.conflictsWith, 'b-1')
})

test('a booking that starts exactly when the turnaround ends is accepted', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 10 })
  const r = s.book({ id: 'b-2', room: 'oak', start: 680, end: 740, attendees: 10 })
  assert.equal(r.status, 'booked')
})

test('the studio turnaround is owed to the following booking as well', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'ash', start: 300, end: 360, attendees: 4 })
  const r = s.book({ id: 'b-2', room: 'ash', start: 285, end: 295, attendees: 4 })
  assert.equal(r.status, 'rejected')
  assert.equal(r.reason, 'turnaround')
  assert.equal(r.conflictsWith, 'b-1')
})

test('a slot between two bookings owes turnaround to the later one too', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 400, end: 440, attendees: 10 })
  s.book({ id: 'b-2', room: 'oak', start: 600, end: 660, attendees: 10 })
  const r = s.book({ id: 'b-3', room: 'oak', start: 500, end: 585, attendees: 10 })
  assert.equal(r.status, 'rejected')
  assert.equal(r.reason, 'turnaround')
  assert.equal(r.conflictsWith, 'b-2')
})
