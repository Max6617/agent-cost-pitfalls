/**
 * A small walkthrough of the public surface - the example from the README.
 * Run it with: node bin/demo.js
 */
import {
  createBookingCalendar,
  freeDays,
  busyPeriods,
  trialStatus,
  billableDays,
} from '../src/index.js'

const calendar = createBookingCalendar()
calendar.book({ room: 'ash', guest: 'Ada', start: 3, end: 8 })
calendar.book({ room: 'ash', guest: 'Bea', start: 8, end: 12 })

const busy = calendar.list('ash')
console.log(JSON.stringify({
  bookings: busy,
  openDays: freeDays(busy, { start: 1, end: 15 }),
  busyPeriods: busyPeriods(busy),
  trial: trialStatus({ start: 1, lengthDays: 14 }, 10),
  billable: billableDays({ start: 1, end: 32 }, { start: 10, end: 20 }),
}, null, 2))
