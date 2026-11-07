/**
 * Period helpers. A period is a `YYYY-MM` key; everything in the ledger is
 * reported per period.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_RE = /^\d{4}-\d{2}$/

export function isDate(value) {
  return typeof value === 'string' && DATE_RE.test(value)
}

export function isMonthKey(value) {
  return typeof value === 'string' && MONTH_RE.test(value)
}

/** '2024-01-31' -> '2024-01' */
export function periodOf(date) {
  return String(date).slice(0, 7)
}

/** '2024-02' -> '2024-02-29' (the last day of that month). */
export function periodEnd(period) {
  if (!isMonthKey(period)) throw new Error('not a period: ' + period)
  const [y, m] = period.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return period + '-' + String(last).padStart(2, '0')
}

/**
 * Is `date` inside a report as of `asOf`?
 *
 * Dates are ISO strings, so the comparison is lexicographic. A report includes
 * everything up to and including the day it is taken on.
 */
export function onOrBefore(date, asOf) {
  if (!asOf) return true
  return String(date) <= String(asOf)
}

export function inPeriod(date, period) {
  return periodOf(date) === period
}
