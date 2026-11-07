/**
 * The booking calendar.
 *
 * A booking is { id, room, guest, start, end }: the guest arrives on day
 * `start` and leaves on day `end`, and the room is the next guest's from
 * day `end`. Bookings are numbered B-001, B-002, ... in the order they are
 * accepted.
 */
import { overlaps } from './intervals.js'
import { byStartThenEnd } from './util/sort.js'

export function createBookingCalendar() {
  const bookings = []
  let next = 1

  const bookingId = () => 'B-' + String(next++).padStart(3, '0')

  return {
    /**
     * Book a stay. Refused with { ok: false, reason: 'conflict', conflicts }
     * when the room is taken on any day of the stay; `conflicts` says which
     * existing bookings the stay ran into.
     */
    book({ room, guest, start, end }) {
      const clashes = bookings.filter((b) => b.room === room && overlaps(b, { start, end }))
      if (clashes.length) {
        return { ok: false, reason: 'conflict', conflicts: clashes.map((c) => c.id) }
      }
      const booking = { id: bookingId(), room, guest, start, end }
      bookings.push(booking)
      return { ok: true, booking }
    },

    /** Cancel a booking by id; true when there was something to cancel. */
    cancel(id) {
      const at = bookings.findIndex((b) => b.id === id)
      if (at === -1) return false
      bookings.splice(at, 1)
      return true
    },

    /** Every booking for a room (all rooms when omitted), earliest first. */
    list(room) {
      return bookings
        .filter((b) => room === undefined || b.room === room)
        .slice()
        .sort(byStartThenEnd)
    },
  }
}
