import { ScheduleError } from './errors.js'
import { daysInMonth } from './calendar.js'

/**
 * Instants cross the public surface as ISO-8601 strings and are always UTC.
 * A string with no zone designator is a UTC reading, not a local one: the
 * planner never consults the system timezone.
 */
const INSTANT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:?\d{2})?$/

export function parseInstant(text) {
  const value = typeof text === 'string' ? text.trim() : ''
  const parts = INSTANT.exec(value)
  if (!parts) throw new ScheduleError('instant', '"' + text + '" is not an instant')

  const year = Number(parts[1])
  const month = Number(parts[2])
  const day = Number(parts[3])
  const hour = Number(parts[4])
  const minute = Number(parts[5])
  const second = Number(parts[6])
  // A date that does not exist is reported, never rolled into the next month.
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month) ||
    hour > 23 || minute > 59 || second > 59) {
    throw new ScheduleError('instant', '"' + text + '" is not an instant')
  }

  const at = new Date(0)
  at.setUTCFullYear(year, month - 1, day)
  at.setUTCHours(hour, minute, second, 0)
  let ms = at.getTime()

  const zone = parts[8]
  if (zone && zone !== 'Z') {
    const offsetHours = Number(zone.slice(1, 3))
    const offsetMinutes = Number(zone.slice(-2))
    if (offsetHours > 23 || offsetMinutes > 59) {
      throw new ScheduleError('instant', '"' + text + '" is not an instant')
    }
    const offset = (offsetHours * 60 + offsetMinutes) * 60000
    ms -= zone[0] === '-' ? -offset : offset
  }
  return ms
}

/** Milliseconds since the epoch -> `YYYY-MM-DDTHH:mm:ssZ`. */
export function formatInstant(ms) {
  const at = new Date(ms)
  const pad = (n, width = 2) => String(n).padStart(width, '0')
  return pad(at.getUTCFullYear(), 4) + '-' + pad(at.getUTCMonth() + 1) + '-' + pad(at.getUTCDate()) +
    'T' + pad(at.getUTCHours()) + ':' + pad(at.getUTCMinutes()) + ':' + pad(at.getUTCSeconds()) + 'Z'
}
