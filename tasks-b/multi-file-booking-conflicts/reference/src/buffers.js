import { overlaps } from './intervals.js'

/**
 * Turnaround enforcement.
 *
 * Between two bookings in the same room facilities needs `buffer` free minutes
 * (docs/booking-rules.md, section 4). Overlaps are reported by the caller as
 * their own reason; this measures only the gap between two disjoint spans.
 */
export function breachesTurnaround(buffer, start, end, other) {
  if (overlaps(start, end, other.start, other.end)) return false
  const gapAfter = start - other.end
  if (gapAfter >= 0 && gapAfter < buffer) return true
  const gapBefore = other.start - end
  if (gapBefore >= 0 && gapBefore < buffer) return true
  return false
}
