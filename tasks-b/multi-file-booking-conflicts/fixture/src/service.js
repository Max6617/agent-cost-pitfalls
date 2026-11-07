import { isValidRange } from './intervals.js'
import { holds, turnaroundFor } from './rooms.js'
import { createBookings, findConflict, findTurnaroundBreach } from './bookings.js'
import { createWaitlist } from './waitlist.js'

/**
 * The booking service. It keeps the confirmed bookings and the waitlist, and
 * applies the rules in docs/booking-rules.md in the order that document lists
 * them: room, range, capacity, overlap, turnaround.
 */
export class BookingService {
  constructor({ rooms = [] } = {}) {
    this.directory = new Map(rooms.map((room) => [room.id, room]))
    this.store = createBookings()
    this.queue = createWaitlist()
  }

  /**
   * Try to confirm a request `{ id, room, start, end, attendees }`.
   * The result shapes are documented in docs/booking-rules.md, section 3.
   */
  book(request) {
    const room = this.directory.get(request.room)
    if (!room) return { status: 'rejected', reason: 'unknown-room' }
    if (!isValidRange(request.start, request.end)) {
      return { status: 'rejected', reason: 'invalid-range' }
    }
    if (!holds(room, request.attendees)) {
      return { status: 'rejected', reason: 'capacity' }
    }
    const confirmed = this.store.forRoom(request.room)
    const conflict = findConflict(confirmed, request.start, request.end)
    if (conflict) {
      return { status: 'rejected', reason: 'overlap', conflictsWith: conflict.id }
    }
    const breach = findTurnaroundBreach(confirmed, turnaroundFor(room.type), request.start, request.end)
    if (breach) {
      return { status: 'rejected', reason: 'turnaround', conflictsWith: breach.id }
    }
    this.store.add({ ...request })
    return { status: 'booked', id: request.id }
  }

  /** Cancel a confirmed booking. docs/booking-rules.md, section 5. */
  cancel(id) {
    const booking = this.store.remove(id)
    if (!booking) return { status: 'not-found', id }
    return { status: 'cancelled', id, promoted: [] }
  }

  /** Queue a request that cannot be placed yet. docs §6. */
  joinWaitlist(request) {
    if (!this.directory.has(request.room)) return { status: 'rejected', reason: 'unknown-room' }
    if (!isValidRange(request.start, request.end)) {
      return { status: 'rejected', reason: 'invalid-range' }
    }
    return this.queue.add(request)
  }

  /** The confirmed bookings of a room, in start order. */
  bookings(roomId) {
    return this.store.forRoom(roomId).sort((a, b) => a.start - b.start)
  }

  /** The whole queue, oldest request first. */
  waitlist() {
    return this.queue.entries()
  }
}
