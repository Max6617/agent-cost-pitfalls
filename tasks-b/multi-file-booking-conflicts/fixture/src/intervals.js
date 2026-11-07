/**
 * Interval arithmetic on integer minutes.
 *
 * A booking occupies the half-open interval [start, end): the end minute is the
 * first minute the room is free again. Everything that asks "do these two spans
 * share a minute" goes through here, so there is exactly one answer.
 */

/** Do [aStart, aEnd) and [bStart, bEnd) share a minute? */
export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd
}

/** A request must span at least one whole minute. */
export function isValidRange(start, end) {
  return Number.isInteger(start) && Number.isInteger(end) && start < end
}
