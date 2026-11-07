/**
 * Small helpers used across the pipeline.
 *
 * Nothing here logs: these are pure functions and keeping them that way means
 * they can be tested without a logger.
 */

/** Money helper shared with the pricing spreadsheet's rounding rules. */
export function round(value, dp = 2) {
  const factor = 10 ** dp
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/** Does this string look like an order id? */
export function isOrderId(value) {
  return typeof value === 'string' && /^[A-Z]{1,3}-\d{3,}$/.test(value)
}

/** Normalise a postcode for matrix lookup. */
export function normalisePostcode(value) {
  return String(value ?? '').replace(/\s+/g, '').toUpperCase()
}

/** Sum a list of line totals. */
export function totalOf(lines, key = 'lineTotal') {
  return round((lines ?? []).reduce((sum, l) => sum + (Number(l[key]) || 0), 0))
}

/** Bounded retry counter. */
export function nextAttempt(attempt, max = 5) {
  return attempt >= max ? null : attempt + 1
}
