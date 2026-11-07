// Sub-problem 4: promotion is FIFO - an older request is never jumped, even
// when it cannot be placed and a younger one could.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const svc = () => createService({
  rooms: [
    { id: 'oak', type: 'lecture-hall', capacity: 20 },
    { id: 'ash', type: 'studio', capacity: 8 },
  ],
})

test('a waiting request that still lacks turnaround is not skipped over', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 10 })
  s.book({ id: 'b-2', room: 'oak', start: 680, end: 740, attendees: 10 })
  s.joinWaitlist({ id: 'w-1', room: 'oak', start: 665, end: 675, attendees: 5 })
  const r = s.cancel('b-1')
  assert.deepEqual(r.promoted, [])
  assert.deepEqual(s.waitlist().map((q) => q.id), ['w-1'])
  assert.deepEqual(s.bookings('oak').map((b) => b.id), ['b-2'])
})

test('promotion walks the queue in order while requests can be placed', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 10 })
  s.joinWaitlist({ id: 'w-1', room: 'oak', start: 600, end: 620, attendees: 5 })
  s.joinWaitlist({ id: 'w-2', room: 'oak', start: 640, end: 660, attendees: 5 })
  const r = s.cancel('b-1')
  assert.deepEqual(r.promoted, ['w-1', 'w-2'])
})

test('a blocked request stops the walk even when a later one would fit', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 10 })
  s.joinWaitlist({ id: 'w-1', room: 'oak', start: 600, end: 640, attendees: 5 })
  s.joinWaitlist({ id: 'w-2', room: 'oak', start: 630, end: 700, attendees: 5 })
  s.joinWaitlist({ id: 'w-3', room: 'oak', start: 720, end: 780, attendees: 5 })
  const r = s.cancel('b-1')
  assert.deepEqual(r.promoted, ['w-1'])
  assert.deepEqual(s.waitlist().map((q) => q.id), ['w-2', 'w-3'])
})

test('a cancellation only promotes requests for the freed room', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 10 })
  s.book({ id: 'b-2', room: 'ash', start: 600, end: 660, attendees: 4 })
  s.joinWaitlist({ id: 'w-1', room: 'ash', start: 600, end: 660, attendees: 4 })
  s.joinWaitlist({ id: 'w-2', room: 'oak', start: 600, end: 660, attendees: 5 })
  const r = s.cancel('b-1')
  assert.deepEqual(r.promoted, ['w-2'])
  assert.deepEqual(s.waitlist().map((q) => q.id), ['w-1'])
  assert.deepEqual(s.bookings('ash').map((b) => b.id), ['b-2'])
})

test('a request that can never fit still blocks the queue behind it', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 10 })
  s.joinWaitlist({ id: 'w-1', room: 'oak', start: 600, end: 660, attendees: 30 })
  s.joinWaitlist({ id: 'w-2', room: 'oak', start: 600, end: 660, attendees: 5 })
  const r = s.cancel('b-1')
  assert.deepEqual(r.promoted, [])
  assert.deepEqual(s.waitlist().map((q) => q.id), ['w-1', 'w-2'])
})

test('a waiting request that exactly fills the room can be promoted', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 4 })
  s.joinWaitlist({ id: 'w-1', room: 'oak', start: 600, end: 660, attendees: 20 })
  s.joinWaitlist({ id: 'w-2', room: 'oak', start: 610, end: 650, attendees: 4 })
  const r = s.cancel('b-1')
  assert.deepEqual(r.promoted, ['w-1'])
  assert.deepEqual(s.waitlist().map((q) => q.id), ['w-2'])
})
