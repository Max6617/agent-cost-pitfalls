// Sub-problem 6: a refusal names the conflicting booking - and when several
// collide, the one with the earliest start.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const svc = () => createService({ rooms: [{ id: 'oak', type: 'lecture-hall', capacity: 30 }] })

test('a refusal names the earliest-starting booking among those it hits', () => {
  const s = svc()
  s.book({ id: 'x-1', room: 'oak', start: 600, end: 660, attendees: 4 })
  s.book({ id: 'y-1', room: 'oak', start: 540, end: 580, attendees: 4 })
  const r = s.book({ id: 'b-2', room: 'oak', start: 550, end: 620, attendees: 4 })
  assert.equal(r.status, 'rejected')
  assert.equal(r.reason, 'overlap')
  assert.equal(r.conflictsWith, 'y-1')
})

test('the earliest start wins, not the order the bookings arrived in', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 760, end: 800, attendees: 4 })
  s.book({ id: 'x-1', room: 'oak', start: 680, end: 720, attendees: 4 })
  s.book({ id: 'a-1', room: 'oak', start: 600, end: 640, attendees: 4 })
  const r = s.book({ id: 'b-9', room: 'oak', start: 630, end: 770, attendees: 4 })
  assert.equal(r.status, 'rejected')
  assert.equal(r.reason, 'overlap')
  assert.equal(r.conflictsWith, 'a-1')
})

test('an overlap is reported even when the request also cuts into a turnaround', () => {
  const s = svc()
  s.book({ id: 'p-1', room: 'oak', start: 600, end: 660, attendees: 4 })
  s.book({ id: 'q-1', room: 'oak', start: 540, end: 580, attendees: 4 })
  s.book({ id: 'z-1', room: 'oak', start: 720, end: 780, attendees: 4 })
  const r = s.book({ id: 'b-2', room: 'oak', start: 550, end: 710, attendees: 4 })
  assert.equal(r.status, 'rejected')
  assert.equal(r.reason, 'overlap')
  assert.equal(r.conflictsWith, 'q-1')
})
