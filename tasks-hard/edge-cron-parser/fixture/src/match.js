import { toSchedule } from './parse.js'
import { parseInstant } from './instant.js'
import { startOfUTCDay } from './calendar.js'
import { dayAllowed } from './dayrule.js'

/**
 * Is `instant` an occurrence of the schedule? The same answer the walk gives,
 * without walking: the day has to qualify and the time of day has to be one of
 * the times the schedule runs at.
 */
export function matches(expression, instant) {
  let schedule
  try {
    schedule = toSchedule(expression)
  } catch {
    return false
  }

  const ms = parseInstant(instant)
  const dayMs = startOfUTCDay(ms)
  if (!dayAllowed(schedule, dayMs)) return false

  const at = new Date(ms)
  return schedule.fields.hour.includes(at.getUTCHours()) &&
    schedule.fields.minute.includes(at.getUTCMinutes())
}
