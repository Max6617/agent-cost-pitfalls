/**
 * The room directory.
 *
 * Every room has a type, and the type decides the turnaround time: how many
 * free minutes facilities needs around a booking for cleaning and reset
 * (docs/booking-rules.md, section 4).
 */
export const ROOM_TYPES = {
  'lecture-hall': { turnaround: 20 },
  studio: { turnaround: 10 },
  'phone-booth': { turnaround: 0 },
}

/** Turnaround minutes for a room type; types outside the table need none. */
export function turnaroundFor(type) {
  const entry = ROOM_TYPES[type]
  return entry ? entry.turnaround : 0
}

/** Does the room seat this many people? */
export function holds(room, attendees) {
  return attendees <= room.capacity
}
