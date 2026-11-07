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

/** The earliest-starting confirmed booking among those [start, end) collides
 *  with (docs §3): the collision the refusal names. */
export function findConflict(list, start, end) {
  let hit = null
  for (const booking of list) {
    if (!overlaps(start, end, booking.start, booking.end)) continue
    if (!hit || booking.start < hit.start) hit = booking
  }
  return hit
}

/** The earliest-starting confirmed booking among those whose turnaround
 *  [start, end) cuts into (docs §4). */
export function findTurnaroundBreach(list, buffer, start, end) {
  let hit = null
  for (const booking of list) {
    if (!breachesTurnaround(buffer, start, end, booking)) continue
    if (!hit || booking.start < hit.start) hit = booking
  }
  return hit
}
