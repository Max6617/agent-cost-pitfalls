/**
 * Timestamps.
 *
 * One format on the wire and in storage: RFC 3339 / ISO 8601 in UTC, with
 * milliseconds and a literal `Z` — `2026-03-04T05:06:07.000Z`. Nothing else is
 * accepted from a client and nothing else is written.
 *
 * Local time is never involved. The service runs in containers in three regions
 * and a local-time timestamp is a bug that only shows up during an incident.
 */

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/

/**
 * Format an instant.
 *
 * @param {Date|number} instant
 * @returns {string}
 */
export function toTimestamp(instant) {
  const date = instant instanceof Date ? instant : new Date(instant)
  return date.toISOString()
}

/**
 * Parse a timestamp that arrived from a client.
 *
 * Only the UTC form is accepted: `2026-03-04T05:06:07Z` and the millisecond
 * variant. An offset form is rejected rather than converted, because accepting
 * it invites clients to send local time and the conversion hides the mistake.
 *
 * @param {string} text
 * @returns {Date|null}
 */
export function parseTimestamp(text) {
  const value = String(text ?? '').trim()
  if (!ISO_UTC.test(value)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** The timestamp to record for an event happening now. */
export function nowTimestamp(clock = () => Date.now()) {
  return toTimestamp(clock())
}

/** Is this a timestamp we would have written? */
export function isTimestamp(text) {
  return parseTimestamp(text) !== null
}

/** Shorten a timestamp for a table cell: `2026-03-04 05:06`. */
export function shortStamp(text) {
  const date = parseTimestamp(text)
  if (!date) return ''
  const iso = date.toISOString()
  return iso.slice(0, 10) + ' ' + iso.slice(11, 16)
}
