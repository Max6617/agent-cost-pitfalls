import { toSchedule } from './parse.js'
import { parseInstant, formatInstant } from './instant.js'
import { startOfUTCDay, MS_PER_DAY } from './calendar.js'
import { dayAllowed } from './dayrule.js'
import { ScheduleError } from './errors.js'

/**
 * How far ahead the walk is willing to look. Eight years covers a whole leap
 * cycle, so a schedule that can run at all is found from any starting point.
 */
const MAX_SEARCH_DAYS = 2922

/** The seconds of the day a schedule runs at, ascending. */
function timesOfDay(schedule) {
  const out = []
  for (const hour of schedule.fields.hour) {
    for (const minute of schedule.fields.minute) {
      for (const second of schedule.fields.second) {
        out.push(hour * 3600 + minute * 60 + second)
      }
    }
  }
  return out.sort((a, b) => a - b)
}

/**
 * The next `count` instants of a schedule, as ISO-8601 UTC strings, ascending.
 */
export function nextOccurrences(expression, from, count = 1) {
  const schedule = toSchedule(expression)
  const fromMs = parseInstant(from)
  if (!Number.isInteger(count) || count < 1) {
    throw new ScheduleError('value', 'count must be a positive integer')
  }

  const seen = []
  // Strictly after the instant we were given, to the second.
  const notBefore = Math.floor(fromMs / 1000) * 1000 + 1000
  const firstDay = startOfUTCDay(fromMs)
  const times = timesOfDay(schedule)

  for (let day = 0; day <= MAX_SEARCH_DAYS; day += 1) {
    const dayMs = firstDay + day * MS_PER_DAY
    if (!dayAllowed(schedule, dayMs)) continue
    for (const second of times) {
      const at = dayMs + second * 1000
      if (at < notBefore) continue
      seen.push(formatInstant(at))
      if (seen.length === count) return seen
    }
  }

  throw new ScheduleError(
    'no-occurrence',
    '"' + schedule.expression + '" has no occurrence in the next ' + MAX_SEARCH_DAYS + ' days',
  )
}
