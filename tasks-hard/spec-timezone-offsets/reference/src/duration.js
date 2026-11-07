/**
 * Duration arithmetic.
 *
 * Two entry points, and the difference between them is the whole point of this
 * module: one advances an instant by elapsed time, the other advances a wall
 * clock. docs/time-rules.md §7 has the rules.
 */
import { instantToLocal, localToInstant } from './wallclock.js'
import { InvalidDurationError } from './errors.js'
import {
  MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND,
  daysInMonth, epochFromParts, partsFromEpoch, normaliseLocal,
} from './civil.js'

const FIELDS = ['months', 'days', 'hours', 'minutes', 'seconds']

export function normaliseDuration(duration) {
  if (!duration || typeof duration !== 'object') {
    throw new InvalidDurationError('a duration is an object of whole numbers')
  }
  const out = {}
  for (const field of FIELDS) {
    const value = duration[field] ?? 0
    if (!Number.isInteger(value)) {
      throw new InvalidDurationError(field + ' must be a whole number of units')
    }
    out[field] = value
  }
  return out
}

/**
 * Move an instant by elapsed time. A day is 24 hours of elapsed time, so the
 * local reading of the result can be an hour away from the reading we started
 * with - that is what a clock change does to a fixed period.
 */
export function addToInstant(zone, instant, duration) {
  const d = normaliseDuration(duration)
  if (d.months !== 0) {
    throw new InvalidDurationError('months are a calendar unit and have no length in elapsed time', 'CALENDAR_UNIT_ON_INSTANT')
  }
  const elapsed = d.days * MS_PER_DAY + d.hours * MS_PER_HOUR
    + d.minutes * MS_PER_MINUTE + d.seconds * MS_PER_SECOND
  const moved = instant + elapsed
  return { instant: moved, local: instantToLocal(zone, moved) }
}

/**
 * Move a wall clock. The reading keeps its time of day whatever the offset does
 * in between, and only the reading that comes out is resolved.
 */
export function addToLocal(zone, local, duration) {
  const d = normaliseDuration(duration)
  const reading = normaliseLocal(local)
  let naive = epochFromParts(reading)
  if (d.months !== 0) naive = addMonths(naive, d.months)
  naive += d.days * MS_PER_DAY + d.hours * MS_PER_HOUR
    + d.minutes * MS_PER_MINUTE + d.seconds * MS_PER_SECOND
  return localToInstant(zone, partsFromEpoch(naive))
}

/** Month arithmetic on a wall clock, clamping the day to the target month. */
function addMonths(naive, months) {
  const p = partsFromEpoch(naive)
  const index = p.year * 12 + (p.month - 1) + months
  const year = Math.floor(index / 12)
  const month = index - year * 12 + 1
  const day = Math.min(p.day, daysInMonth(year, month))
  return epochFromParts({ year, month, day, hour: p.hour, minute: p.minute, second: p.second })
}
