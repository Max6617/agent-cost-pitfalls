import { overlaps } from './intervals.js'
import { breachesTurnaround } from './buffers.js'

/**
 * The booking store: the confirmed bookings, keyed by id and listed per room.
 * Per-room lists are kept in the order the bookings were confirmed.
 */
export function createBookings() {
  const byId = new Map()
  const byRoom = new Map()

  const listFor = (roomId) => {
    if (!byRoom.has(roomId)) byRoom.set(roomId, [])
    return byRoom.get(roomId)
  }

  return {
    add(booking) {
      byId.set(booking.id, booking)
      listFor(booking.room).push(booking)
    },
    remove(id) {
      const booking = byId.get(id) ?? null
      if (!booking) return null
      byId.delete(id)
      const list = listFor(booking.room)
      list.splice(list.indexOf(booking), 1)
      return booking
    },
    get(id) {
      return byId.get(id) ?? null
    },
    forRoom(roomId) {
      return [...listFor(roomId)]
    },
  }
}

/** The confirmed booking that [start, end) collides with, if any (docs §3). */
export function findConflict(list, start, end) {
  for (const booking of list) {
    if (overlaps(start, end, booking.start, booking.end)) return booking
  }
  return null
}

/** The confirmed booking whose turnaround [start, end) cuts into (docs §4). */
export function findTurnaroundBreach(list, buffer, start, end) {
  for (const booking of list) {
    if (breachesTurnaround(buffer, start, end, booking)) return booking
  }
  return null
}
