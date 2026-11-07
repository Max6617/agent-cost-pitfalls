/**
 * Usage billing. A billing cycle is an interval; usage arrives as intervals
 * too. Only the days a usage spends inside the cycle are billable.
 */

/** How many days of `usage` fall inside `cycle`. */
export function billableDays(cycle, usage) {
  const first = Math.max(cycle.start, usage.start)
  const last = Math.min(cycle.end, usage.end)
  return first <= last ? last - first + 1 : 0
}

/**
 * The charge for a usage at an integer per-day rate (minor units), as
 * { days, amount }.
 */
export function prorate(cycle, usage, dailyRate) {
  const days = billableDays(cycle, usage)
  return { days, amount: days * dailyRate }
}
