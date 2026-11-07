/**
 * Duration arithmetic.
 *
 * Two entry points, and the difference between them is the whole point of this
 * module: one moves an instant, the other moves a wall clock.
 * docs/time-rules.md §7 has the rules.
 */
import { instantToLocal, localToInstant } from './wallclock.js'
import { InvalidDurationError } from './errors.js'
import {
  MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND,
  daysInMonth, epochFromParts, partsFromEpoch, normaliseLocal,
} from './civil.js'

const FIELDS = ['months', 'days', 'hours', 'minutes', 'seconds']

// "One month" for callers that only ever pass whole months: the extract is
// monthly, so a month is the average length of one in the Gregorian calendar.
const MONTH_IN_DAYS = 30

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
 * Move an instant by a duration. The worker thinks in site-local time - "run it
 * again tomorrow at the same time of day" - so the arithmetic is done on the
 * wall clock and the result is converted back.
 */
export function addToInstant(zone, instant, duration) {
  const d = normaliseDuration(duration)
  const here = instantToLocal(zone, instant)
  let naive = epochFromParts({
    year: here.year, month: here.month, day: here.day,
    hour: here.hour, minute: here.minute, second: here.second,
  })
  if (d.months !== 0) naive = addMonths(naive, d.months)
  naive += d.days * MS_PER_DAY + d.hours * MS_PER_HOUR
    + d.minutes * MS_PER_MINUTE + d.seconds * MS_PER_SECOND
  const moved = localToInstant(zone, partsFromEpoch(naive)).instant
  return { instant: moved, local: instantToLocal(zone, moved) }
}

/**
 * Move a wall clock by a duration. The instant behind the reading is the thing
 * that actually advances, so the arithmetic is done there and the reading that
 * comes out is the one the result lands on.
 */
export function addToLocal(zone, local, duration) {
  const d = normaliseDuration(duration)
  const reading = normaliseLocal(local)
  const base = localToInstant(zone, reading).instant
  const elapsed = (d.months * MONTH_IN_DAYS + d.days) * MS_PER_DAY
    + d.hours * MS_PER_HOUR + d.minutes * MS_PER_MINUTE + d.seconds * MS_PER_SECOND
  const moved = base + elapsed
  const landed = instantToLocal(zone, moved)
  return {
    instant: moved,
    offsetMinutes: landed.offsetMinutes,
    resolution: 'exact',
    local: {
      year: landed.year, month: landed.month, day: landed.day,
      hour: landed.hour, minute: landed.minute, second: landed.second,
    },
  }
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
