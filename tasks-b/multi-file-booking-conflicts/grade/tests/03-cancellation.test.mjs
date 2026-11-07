// Sub-problem 3: cancelling releases the slot and offers it to the waitlist.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const svc = () => createService({ rooms: [{ id: 'oak', type: 'lecture-hall', capacity: 20 }] })

test('cancelling frees the slot, and an unknown id is a not-found', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 10 })
  assert.deepEqual(s.cancel('nope'), { status: 'not-found', id: 'nope' })
  assert.deepEqual(s.cancel('b-1'), { status: 'cancelled', id: 'b-1', promoted: [] })
  const r = s.book({ id: 'b-2', room: 'oak', start: 600, end: 660, attendees: 10 })
  assert.equal(r.status, 'booked')
})

test('a cancellation hands the slot to the waiting request', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 10 })
  const joined = s.joinWaitlist({ id: 'w-1', room: 'oak', start: 600, end: 660, attendees: 5 })
  assert.deepEqual(joined, { status: 'waitlisted', id: 'w-1' })
  const r = s.cancel('b-1')
  assert.deepEqual(r, { status: 'cancelled', id: 'b-1', promoted: ['w-1'] })
  assert.deepEqual(s.waitlist(), [])
  assert.deepEqual(s.bookings('oak').map((b) => b.id), ['w-1'])
})

test('a promoted request collides like any other confirmed booking', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 10 })
  s.joinWaitlist({ id: 'w-1', room: 'oak', start: 600, end: 660, attendees: 5 })
  s.cancel('b-1')
  const r = s.book({ id: 'b-2', room: 'oak', start: 620, end: 700, attendees: 5 })
  assert.equal(r.status, 'rejected')
  assert.equal(r.reason, 'overlap')
  assert.equal(r.conflictsWith, 'w-1')
})

test('the next request in line is not confirmed over the one just promoted', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 10 })
  s.joinWaitlist({ id: 'w-1', room: 'oak', start: 600, end: 640, attendees: 5 })
  s.joinWaitlist({ id: 'w-2', room: 'oak', start: 610, end: 650, attendees: 5 })
  const r = s.cancel('b-1')
  assert.deepEqual(r.promoted, ['w-1'])
  assert.deepEqual(s.waitlist().map((q) => q.id), ['w-2'])
})
