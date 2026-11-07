/**
 * ISO-8601 helpers. The offset table stores transition instants as
 * `YYYY-MM-DDTHH:MM:SSZ`; the CLI prints them the same way.
 */
import { epochFromParts, partsFromEpoch, pad } from '../civil.js'

const INSTANT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/

export function isIsoInstant(value) {
  return typeof value === 'string' && INSTANT_PATTERN.test(value)
}

/** `2024-03-10T07:00:00Z` -> milliseconds since the epoch. */
export function parseIsoInstant(value) {
  const m = INSTANT_PATTERN.exec(String(value))
  if (!m) throw new TypeError('not an ISO instant: ' + value)
  const ms = epochFromParts({
    year: Number(m[1]), month: Number(m[2]), day: Number(m[3]),
    hour: Number(m[4]), minute: Number(m[5]), second: Number(m[6]),
  })
  return ms + (m[7] ? Number(m[7].padEnd(3, '0')) : 0)
}

/** The inverse of parseIsoInstant, seconds precision. */
export function formatIsoInstant(instant) {
  const p = partsFromEpoch(instant)
  return pad(p.year, 4) + '-' + pad(p.month) + '-' + pad(p.day)
    + 'T' + pad(p.hour) + ':' + pad(p.minute) + ':' + pad(p.second) + 'Z'
}
