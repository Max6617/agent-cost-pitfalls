/**
 * Date arithmetic on ISO calendar dates ('YYYY-MM-DD'). Every date in the
 * service is a value the caller passes in; nothing here reads the clock.
 */
const DAY_MS = 86400000

function toUtc(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUtc(ms) {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Days from `from` to `to`: diffDays('2026-03-01', '2026-03-31') is 30. */
export function diffDays(from, to) {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
}

export function addDays(iso, n) {
  return fromUtc(toUtc(iso) + n * DAY_MS)
}

/** Length of a billing period, both end days included. */
export function daysInPeriod(periodStart, periodEnd) {
  return diffDays(periodStart, periodEnd) + 1
}

/** Days of the period still to bill, the effective day itself included. */
export function daysRemaining(effectiveDate, periodEnd) {
  return diffDays(effectiveDate, periodEnd) + 1
}

/** Same calendar day `n` months on, clamped to the target month's last day. */
export function addMonths(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const firstOfTarget = new Date(Date.UTC(y, m - 1 + n, 1))
  const ty = firstOfTarget.getUTCFullYear()
  const tm = firstOfTarget.getUTCMonth()
  const lastOfTarget = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate()
  return fromUtc(Date.UTC(ty, tm, Math.min(d, lastOfTarget)))
}
