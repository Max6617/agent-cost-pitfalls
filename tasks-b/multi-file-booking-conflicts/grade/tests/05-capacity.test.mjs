// Sub-problem 5: capacity is inclusive - exactly full is allowed.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const svc = () => createService({
  rooms: [
    { id: 'oak', type: 'lecture-hall', capacity: 20 },
    { id: 'ash', type: 'studio', capacity: 8 },
    { id: 'booth', type: 'phone-booth', capacity: 2 },
  ],
})

test('a meeting that exactly fills the room is allowed; one more is refused', () => {
  const s = svc()
  const full = s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 20 })
  assert.equal(full.status, 'booked')
  const over = s.book({ id: 'b-2', room: 'ash', start: 600, end: 660, attendees: 9 })
  assert.equal(over.status, 'rejected')
  assert.equal(over.reason, 'capacity')
})

test('every room type seats exactly its capacity', () => {
  const s = svc()
  const ash = s.book({ id: 'b-1', room: 'ash', start: 600, end: 660, attendees: 8 })
  assert.equal(ash.status, 'booked')
  const booth = s.book({ id: 'b-2', room: 'booth', start: 600, end: 660, attendees: 2 })
  assert.equal(booth.status, 'booked')
})

test('a full-but-legal meeting is refused for its clash, not its size', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 4 })
  const r = s.book({ id: 'b-2', room: 'oak', start: 620, end: 700, attendees: 20 })
  assert.equal(r.status, 'rejected')
  assert.equal(r.reason, 'overlap')
  assert.equal(r.conflictsWith, 'b-1')
})
