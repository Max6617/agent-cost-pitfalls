/**
 * Calendar-day arithmetic on 'YYYY-MM-DD' strings.
 *
 * Every operation in the service takes the date it happens on as an argument;
 * nothing in the codebase reads a clock. All arithmetic is done in UTC so a
 * day is exactly 24 hours everywhere.
 */
const DAY_MS = 24 * 60 * 60 * 1000

export function toUtcMillis(date) {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function fromUtcMillis(ms) {
  const d = new Date(ms)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** The date `n` days after `date` (negative n moves backwards). */
export function addDays(date, n) {
  return fromUtcMillis(toUtcMillis(date) + n * DAY_MS)
}

/** Whole days from `from` to `to`; negative when `to` is the earlier day. */
export function diffDays(from, to) {
  return Math.round((toUtcMillis(to) - toUtcMillis(from)) / DAY_MS)
}
