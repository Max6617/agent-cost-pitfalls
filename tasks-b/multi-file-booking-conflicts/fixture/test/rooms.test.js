import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const svc = () => createService({ rooms: [{ id: 'oak', type: 'lecture-hall', capacity: 20 }] })

test('a meeting that exactly fills the room is allowed', () => {
  const s = svc()
  const r = s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 20 })
  assert.equal(r.status, 'booked')
})

test('more people than the room seats is refused', () => {
  const s = svc()
  const r = s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 21 })
  assert.equal(r.status, 'rejected')
  assert.equal(r.reason, 'capacity')
})

test('a refusal names the booking it collides with', () => {
  const s = svc()
  s.book({ id: 'x-1', room: 'oak', start: 600, end: 660, attendees: 4 })
  s.book({ id: 'y-1', room: 'oak', start: 540, end: 580, attendees: 4 })
  const r = s.book({ id: 'b-2', room: 'oak', start: 550, end: 620, attendees: 4 })
  assert.equal(r.status, 'rejected')
  assert.equal(r.reason, 'overlap')
  assert.equal(r.conflictsWith, 'y-1')
})
