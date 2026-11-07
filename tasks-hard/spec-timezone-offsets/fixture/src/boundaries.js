/**
 * Local day, month and year boundaries.
 *
 * Callers use these to bucket queue runs by the day they belong to. The day grid
 * is anchored at the epoch, which starts on a day boundary, so a day is a fixed
 * 24-hour span and can be found by rounding the instant down.
 */
import { MS_PER_DAY, partsFromEpoch } from './civil.js'

function startOfDay(instant) {
  return instant - (((instant % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY)
}

/** The instant at which the day containing `instant` begins. */
export function startOfLocalDay(zone, instant) {
  return startOfDay(instant)
}

/** The instant at which the month containing `instant` begins. */
export function startOfLocalMonth(zone, instant) {
  const p = partsFromEpoch(instant)
  return startOfDay(instant) - (p.day - 1) * MS_PER_DAY
}

/** The last instant of the same day. */
export function endOfLocalDay(zone, instant) {
  return startOfLocalDay(zone, instant) + MS_PER_DAY - 1
}

/** Whether two instants land on the same day. */
export function isSameLocalDay(zone, a, b) {
  return startOfLocalDay(zone, a) === startOfLocalDay(zone, b)
}
