/**
 * Instants.
 *
 * Everything the scheduler handles is an instant: epoch milliseconds, passed in
 * by the caller. Nothing in this module reads a clock, and "now" is never
 * produced here - if a caller wants the current time it has to bring it.
 */
export const SECOND = 1000
export const MINUTE = 60000
export const HOUR = 3600000
export const DAY = 86400000

/** A calendar date, optionally with a wall-clock time, and no zone suffix. */
const WALL = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)?$/

/** An instant, from epoch milliseconds or from an ISO string with a zone. */
export function parseInstant(value, label = 'instant') {
  const ms = toEpoch(value)
  if (ms === null) throw new TypeError(label + ' is not an instant: ' + JSON.stringify(value))
  return ms
}

function toEpoch(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'string') {
    const ms = Date.parse(value)
    if (!Number.isNaN(ms)) return ms
  }
  return null
}

/**
 * A local wall-clock reading ("2024-03-31T05:30:00.000"), parsed as the clock
 * face itself rather than as an instant in the host's timezone.
 */
export function parseWallClock(value) {
  if (typeof value === 'string' && WALL.test(value)) return Date.parse(value + 'Z')
  return parseInstant(value, 'wall clock')
}

/** The UTC rendering of an instant. */
export function toIso(at) {
  return new Date(at).toISOString()
}

/** The wall-clock rendering of an instant, without a zone suffix. */
export function toWallClock(at) {
  return toIso(at).slice(0, -1)
}

/** The calendar date an instant falls on, in UTC. */
export function dateOf(at) {
  return toIso(at).slice(0, 10)
}

/** Midnight UTC of the day an instant falls on. */
export function startOfUtcDay(at) {
  return Math.floor(at / DAY) * DAY
}

export function addUtcDays(at, days) {
  return at + days * DAY
}

export function pad2(value) {
  return String(value).padStart(2, '0')
}
