/**
 * Local day, month and year boundaries.
 *
 * Every one of these is a wall-clock question - "when does local midnight
 * happen" - so they are all built out of the local reading and the resolution
 * rules, not out of arithmetic on the instant.
 */
import { instantToLocal, localToInstant } from './wallclock.js'
import { MS_PER_DAY, epochFromParts, partsFromEpoch } from './civil.js'

/** The instant at which the local day containing `instant` begins. */
export function startOfLocalDay(zone, instant) {
  const p = instantToLocal(zone, instant)
  return localToInstant(zone, { year: p.year, month: p.month, day: p.day, hour: 0, minute: 0, second: 0 }).instant
}

/** The instant at which the local month containing `instant` begins. */
export function startOfLocalMonth(zone, instant) {
  const p = instantToLocal(zone, instant)
  return localToInstant(zone, { year: p.year, month: p.month, day: 1, hour: 0, minute: 0, second: 0 }).instant
}

/**
 * The last instant of the same local day. Not "the start plus 24 hours": a
 * spring-forward day is 23 hours long and a fall-back day is 25.
 */
export function endOfLocalDay(zone, instant) {
  const p = instantToLocal(zone, instant)
  const midnight = epochFromParts({ year: p.year, month: p.month, day: p.day, hour: 0, minute: 0, second: 0 })
  const nextMidnight = partsFromEpoch(midnight + MS_PER_DAY)
  return localToInstant(zone, nextMidnight).instant - 1
}

/** Whether two instants land on the same local date. */
export function isSameLocalDay(zone, a, b) {
  const pa = instantToLocal(zone, a)
  const pb = instantToLocal(zone, b)
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day
}
