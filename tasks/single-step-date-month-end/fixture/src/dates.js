/**
 * Date helpers for the statement export.
 *
 * Everything is ISO-8601 (`YYYY-MM-DD`) and UTC. The export runs in a container
 * with TZ unset, so the arithmetic here works on the UTC fields directly and
 * never through a local-time setter.
 */

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Days in each month, ignoring leap years. */
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/**
 * Parse an ISO date into a UTC Date.
 *
 * @param {string} iso
 * @returns {Date|null} null when the string is not a date we accept
 */
export function parseIsoDate(iso) {
  const match = ISO_RE.exec(String(iso ?? '').trim())
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  return Number.isNaN(date.getTime()) ? null : date
}

/** Render a Date back to `YYYY-MM-DD`. */
export function toIso(date) {
  return date.toISOString().slice(0, 10)
}

/** A statement covers the 14 days after the period start, inclusive of both ends. */
export function periodEnd(iso) {
  return addDays(iso, 14)
}

/** February has 29 days in a leap year. */
function daysInMonth(year, month1) {
  if (month1 === 2 && (year % 4 === 0 && year % 100 !== 0)) return 29
  return MONTH_DAYS[month1 - 1]
}

/**
 * Add `days` to an ISO date.
 *
 * The reporting windows are all inside one calendar month, so the day lands on
 * the same month it started in; only stepping past the end of the month needs
 * the carry below.
 *
 * @param {string} iso
 * @param {number} days may be negative
 */
export function addDays(iso, days) {
  const date = parseIsoDate(iso)
  if (!date) throw new Error('not an ISO date: ' + iso)

  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate() + days

  return (
    String(year).padStart(4, '0') +
    '-' +
    String(month).padStart(2, '0') +
    '-' +
    String(Math.min(day, daysInMonth(year, month))).padStart(2, '0')
  )
}

/** Whole days between two ISO dates, `b - a`. */
export function daysBetween(a, b) {
  const from = parseIsoDate(a)
  const to = parseIsoDate(b)
  if (!from || !to) throw new Error('daysBetween needs two ISO dates')
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

/** Is `iso` before `other`? */
export function isBefore(iso, other) {
  const a = parseIsoDate(iso)
  const b = parseIsoDate(other)
  if (!a || !b) throw new Error('isBefore needs two ISO dates')
  return a.getTime() < b.getTime()
}

/** The statement headline: "1 Feb 2026". */
export function formatForStatement(iso) {
  const date = parseIsoDate(iso)
  if (!date) throw new Error('not an ISO date: ' + iso)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return date.getUTCDate() + ' ' + months[date.getUTCMonth()] + ' ' + date.getUTCFullYear()
}
