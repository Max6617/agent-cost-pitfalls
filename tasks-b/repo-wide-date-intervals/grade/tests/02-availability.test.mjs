// Sub-problem 2: availability - the checkout day is a free day, everywhere
// availability is computed.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createBookingCalendar, freeDays, firstAvailable } from '../src/index.js'

test('the day a guest leaves is open for the next one', () => {
  const busy = [{ start: 3, end: 8 }]
  assert.deepEqual(freeDays(busy, { start: 1, end: 12 }), [1, 2, 8, 9, 10, 11])
})

test('a stay ending where the window begins does not eat the window\'s first day', () => {
  assert.deepEqual(freeDays([{ start: 1, end: 5 }], { start: 5, end: 9 }), [5, 6, 7, 8])
})

test('the first open stretch may begin on a checkout day', () => {
  const busy = [{ start: 3, end: 8 }]
  assert.equal(firstAvailable(busy, { start: 1, end: 15 }, 3), 8)
})

test('two back-to-back bookings leave the second checkout day open', () => {
  const calendar = createBookingCalendar()
  calendar.book({ room: 'ash', guest: 'Ada', start: 3, end: 8 })
  calendar.book({ room: 'ash', guest: 'Bea', start: 8, end: 12 })
  assert.deepEqual(freeDays(calendar.list('ash'), { start: 1, end: 15 }), [1, 2, 12, 13, 14])
})
