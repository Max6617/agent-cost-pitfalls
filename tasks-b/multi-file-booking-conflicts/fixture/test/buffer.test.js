import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const svc = () => createService({ rooms: [{ id: 'oak', type: 'lecture-hall', capacity: 20 }] })

test('a booking that ends too close before the next one is refused', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 10 })
  const r = s.book({ id: 'b-2', room: 'oak', start: 545, end: 595, attendees: 10 })
  assert.equal(r.status, 'rejected')
  assert.equal(r.reason, 'turnaround')
  assert.equal(r.conflictsWith, 'b-1')
})

test('exactly enough turnaround after a booking is accepted', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 10 })
  const r = s.book({ id: 'b-2', room: 'oak', start: 680, end: 740, attendees: 10 })
  assert.equal(r.status, 'booked')
})
