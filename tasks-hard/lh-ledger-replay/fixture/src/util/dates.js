/**
 * Date arithmetic shared by the close job's scheduling. Nothing in the ledger
 * itself depends on the wall clock - the close job passes dates in.
 */

/** The later of two ISO dates. */
export function maxDate(a, b) {
  if (!a) return b ?? null
  if (!b) return a
  return a > b ? a : b
}

/** The earlier of two ISO dates. */
export function minDate(a, b) {
  if (!a) return b ?? null
  if (!b) return a
  return a < b ? a : b
}

/** Whole days between two ISO dates, `to - from`. */
export function daysBetween(from, to) {
  const a = Date.parse(from + 'T00:00:00Z')
  const b = Date.parse(to + 'T00:00:00Z')
  if (Number.isNaN(a) || Number.isNaN(b)) throw new Error('bad date')
  return Math.round((b - a) / 86400000)
}

/** Add whole days to an ISO date. */
export function addDays(date, days) {
  const t = Date.parse(date + 'T00:00:00Z')
  if (Number.isNaN(t)) throw new Error('bad date')
  return new Date(t + days * 86400000).toISOString().slice(0, 10)
}

/** Every period from `from` to `to`, inclusive. */
export function periodsBetween(from, to) {
  const out = []
  let [y, m] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  while (y < ty || (y === ty && m <= tm)) {
    out.push(String(y).padStart(4, '0') + '-' + String(m).padStart(2, '0'))
    m++
    if (m > 12) { m = 1; y++ }
  }
  return out
}
