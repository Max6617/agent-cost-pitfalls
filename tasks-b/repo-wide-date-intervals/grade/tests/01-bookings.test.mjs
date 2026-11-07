// Sub-problem 1: bookings - a stay starting on another stay's checkout day
// does not clash, and a refusal identifies the clashing bookings.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createBookingCalendar, busyPeriods } from '../src/index.js'

test('a stay starting on another stay\'s checkout day is allowed', () => {
  const calendar = createBookingCalendar()
  assert.equal(calendar.book({ room: 'ash', guest: 'Ada', start: 3, end: 8 }).ok, true)
  const backToBack = calendar.book({ room: 'ash', guest: 'Bea', start: 8, end: 12 })
  assert.equal(backToBack.ok, true)
  assert.deepEqual(calendar.list('ash').map((b) => b.guest), ['Ada', 'Bea'])
})

test('a refusal names the clashing bookings by id', () => {
  const calendar = createBookingCalendar()
  calendar.book({ room: 'ash', guest: 'Ada', start: 3, end: 8 })
  calendar.book({ room: 'oak', guest: 'Bea', start: 4, end: 9 })
  const refused = calendar.book({ room: 'ash', guest: 'Cy', start: 6, end: 10 })
  assert.equal(refused.ok, false)
  assert.equal(refused.reason, 'conflict')
  assert.deepEqual(refused.conflicts, ['B-001'])
})

test('back-to-back stays chain into a single busy period', () => {
  const calendar = createBookingCalendar()
  calendar.book({ room: 'ash', guest: 'Ada', start: 1, end: 5 })
  calendar.book({ room: 'ash', guest: 'Bea', start: 5, end: 9 })
  calendar.book({ room: 'ash', guest: 'Cy', start: 9, end: 13 })
  assert.deepEqual(busyPeriods(calendar.list('ash')), [{ start: 1, end: 13 }])
})

test('the same days on a different room never clash', () => {
  const calendar = createBookingCalendar()
  assert.equal(calendar.book({ room: 'ash', guest: 'Ada', start: 3, end: 8 }).ok, true)
  assert.equal(calendar.book({ room: 'oak', guest: 'Bea', start: 3, end: 8 }).ok, true)
})
