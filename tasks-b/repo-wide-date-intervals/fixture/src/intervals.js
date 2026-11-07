/**
 * Shared interval helpers.
 *
 * Everything in the service works in integer day numbers and follows the
 * house convention written down in docs/interval-convention.md: an interval
 * is the half-open range [start, end) - `start` is a day inside the
 * interval, `end` is the first day after it.
 *
 * The modules are expected to go through these helpers rather than compare
 * start/end by hand, so the convention lives in exactly one place.
 */

/** An interval whose start is not before its end holds no days at all. */
export function isEmpty(iv) {
  return iv.start >= iv.end
}

/** Is `day` one of the interval's days? The last day inside is `end - 1`. */
export function contains(iv, day) {
  return day >= iv.start && day < iv.end
}

/**
 * Do the two intervals share at least one day?
 * Touching intervals - [1, 5) and [5, 9) - share nothing.
 */
export function overlaps(a, b) {
  return a.start < b.end && b.start < a.end
}

/** The days common to both intervals, or null when there are none. */
export function intersect(a, b) {
  const start = Math.max(a.start, b.start)
  const end = Math.min(a.end, b.end)
  return start < end ? { start, end } : null
}

/** How many days the interval covers. */
export function duration(iv) {
  return Math.max(0, iv.end - iv.start)
}

/** The part of `iv` lying inside `bounds`, or null when there is none. */
export function clamp(iv, bounds) {
  return intersect(iv, bounds)
}

/**
 * Combine two intervals into their span. Intervals that overlap or run
 * straight into each other - [1, 5) and [5, 9) - become one [1, 9).
 * Returns null for intervals that are truly separate.
 */
export function merge(a, b) {
  if (!overlaps(a, b)) return null
  return { start: Math.min(a.start, b.start), end: Math.max(a.end, b.end) }
}
