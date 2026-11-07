/**
 * booking - public surface.
 *
 * Everything the front desk, the booking board and the calendar sync are
 * allowed to import. Modules under src/ that are not re-exported here are
 * internal and may be reorganised freely; the names below may not.
 */
import { BookingService } from './service.js'

export { BookingService } from './service.js'
export { overlaps, isValidRange } from './intervals.js'
export { ROOM_TYPES, turnaroundFor } from './rooms.js'
export { formatMinute, formatSpan, bookingLabel } from './labels.js'

/**
 * A booking service over a fixed set of rooms:
 *
 *   createService({
 *     rooms: [{ id: 'oak', type: 'lecture-hall', capacity: 20 }],
 *   })
 *
 * Times are integer minutes past midnight; there is no clock anywhere.
 */
export function createService(config = {}) {
  return new BookingService(config)
}
