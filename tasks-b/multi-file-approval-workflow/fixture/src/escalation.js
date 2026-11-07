/**
 * Deadlines. A deadline is not a wall the service checks on every call: time
 * acts only through expiry events, and an expiry event exists only when
 * `expire()` is called with a moment at which it is due.
 *
 * The event is due strictly after the deadline instant — at the deadline
 * itself the tier is still actionable, and an `expire` at exactly that
 * instant must change nothing.
 */

/** All timestamps are ISO-8601 UTC, so string order is time order. */
export function isDue(deadline, at) {
  return at >= deadline
}
