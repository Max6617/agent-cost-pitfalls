// Sub-problem 1: intervals are half-open [start, end); touching is not an overlap.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService, overlaps } from '../src/index.js'

const booths = () => createService({ rooms: [{ id: 'booth', type: 'phone-booth', capacity: 2 }] })
const studios = () => createService({ rooms: [{ id: 'ash', type: 'studio', capacity: 8 }] })

test('an interval that ends when the other begins does not overlap it', () => {
  assert.equal(overlaps(540, 600, 600, 660), false)
})

test('an interval that begins when the other ends does not overlap it', () => {
  assert.equal(overlaps(600, 660, 540, 600), false)
})

test('back-to-back bookings are accepted in a room with no turnaround', () => {
  const svc = booths()
  svc.book({ id: 'b-1', room: 'booth', start: 540, end: 600, attendees: 1 })
  const second = svc.book({ id: 'b-2', room: 'booth', start: 600, end: 660, attendees: 1 })
  assert.equal(second.status, 'booked')
  assert.deepEqual(svc.bookings('booth').map((b) => b.id), ['b-1', 'b-2'])
})

test('ending exactly when the next booking starts still owes its turnaround', () => {
  const svc = studios()
  svc.book({ id: 'b-1', room: 'ash', start: 600, end: 660, attendees: 4 })
  const r = svc.book({ id: 'b-2', room: 'ash', start: 590, end: 600, attendees: 4 })
  assert.equal(r.status, 'rejected')
  assert.equal(r.reason, 'turnaround')
  assert.equal(r.conflictsWith, 'b-1')
})
