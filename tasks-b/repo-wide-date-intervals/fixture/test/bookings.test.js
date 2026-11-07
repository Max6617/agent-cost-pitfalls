import test from 'node:test'
import assert from 'node:assert/strict'
import { createBookingCalendar } from '../src/index.js'

test('a guest can book from the day the previous guest leaves', () => {
  const calendar = createBookingCalendar()
  assert.equal(calendar.book({ room: 'ash', guest: 'Ada', start: 3, end: 8 }).ok, true)
  const second = calendar.book({ room: 'ash', guest: 'Bea', start: 8, end: 12 })
  assert.equal(second.ok, true)
})

test('a stay over days already taken is refused', () => {
  const calendar = createBookingCalendar()
  calendar.book({ room: 'ash', guest: 'Ada', start: 3, end: 8 })
  const refused = calendar.book({ room: 'ash', guest: 'Cy', start: 6, end: 10 })
  assert.equal(refused.ok, false)
  assert.equal(refused.reason, 'conflict')
})
