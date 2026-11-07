/**
 * Money is integer cents, end to end. A value of 1250 means 12.50 in whatever
 * currency the group agreed on; fractional cents do not exist, and binary
 * floating point is never allowed to carry a money value across a boundary.
 * Every helper here takes cents and returns cents.
 */

/** A legible amount is a positive integer number of cents. */
export function isCents(n) {
  return typeof n === 'number' && Number.isInteger(n) && n > 0
}

/** Total of a list of cent amounts. */
export function sumCents(values) {
  let total = 0
  for (const v of values) total += v
  return total
}

/**
 * The whole cents of `pct` percent of `cents` (pct is an integer 1..100).
 * Multiply first, then divide: integer arithmetic all the way down, so the
 * result is the exact floor - `cents * (pct / 100)` goes through a float
 * ratio and lands a cent short on exact boundaries.
 */
export function percentOf(cents, pct) {
  return Math.floor((cents * pct) / 100)
}
