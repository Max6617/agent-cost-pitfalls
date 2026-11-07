/**
 * Usage billing. A billing cycle is an interval; usage arrives as intervals
 * too. Only the days a usage spends inside the cycle are billable.
 */
import { intersect, duration } from './intervals.js'

/** How many days of `usage` fall inside `cycle`. */
export function billableDays(cycle, usage) {
  const shared = intersect(cycle, usage)
  return shared ? duration(shared) : 0
}

/**
 * The charge for a usage at an integer per-day rate (minor units), as
 * { days, amount }.
 */
export function prorate(cycle, usage, dailyRate) {
  const days = billableDays(cycle, usage)
  return { days, amount: days * dailyRate }
}
