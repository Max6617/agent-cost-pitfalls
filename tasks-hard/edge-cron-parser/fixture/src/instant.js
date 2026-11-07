import { ScheduleError } from './errors.js'

/**
 * Instants cross the public surface as ISO-8601 strings and are always UTC.
 * A string with no zone designator is a UTC reading, not a local one: the
 * planner never consults the system timezone.
 */
const INSTANT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:?\d{2})?$/

export function parseInstant(text) {
  const value = typeof text === 'string' ? text.trim() : ''
  if (!INSTANT.test(value)) {
    throw new ScheduleError('instant', '"' + text + '" is not an instant')
  }
  const zoned = /(Z|[+-]\d{2}:?\d{2})$/.test(value)
  const ms = Date.parse(zoned ? value : value + 'Z')
  if (Number.isNaN(ms)) throw new ScheduleError('instant', '"' + text + '" is not an instant')
  return ms
}

/** Milliseconds since the epoch -> `YYYY-MM-DDTHH:mm:ssZ`. */
export function formatInstant(ms) {
  const at = new Date(ms)
  const pad = (n, width = 2) => String(n).padStart(width, '0')
  return pad(at.getUTCFullYear(), 4) + '-' + pad(at.getUTCMonth() + 1) + '-' + pad(at.getUTCDate()) +
    'T' + pad(at.getUTCHours()) + ':' + pad(at.getUTCMinutes()) + ':' + pad(at.getUTCSeconds()) + 'Z'
}
