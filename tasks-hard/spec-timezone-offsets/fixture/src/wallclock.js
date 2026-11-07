/**
 * Instant <-> local reading.
 *
 * An offset is a function of the instant, so the two directions look symmetric:
 * take the offset, shift by it, and you are done. docs/time-rules.md has the
 * rules; §5 is the one about readings that are not times that ever happened.
 */
import { resolveZone } from './zones.js'
import { offsetAt } from './offsets.js'
import {
  MS_PER_MINUTE, MS_PER_DAY, MS_PER_HOUR, epochFromParts, partsFromEpoch, normaliseLocal,
} from './civil.js'

const SEARCH_WINDOW = MS_PER_DAY + MS_PER_HOUR

/** The local reading at an instant, with the offset that produced it. */
export function instantToLocal(zone, instant) {
  const resolved = resolveZone(zone)
  const offsetMinutes = offsetAt(resolved, instant)
  const parts = partsFromEpoch(instant + offsetMinutes * MS_PER_MINUTE)
  return {
    year: parts.year, month: parts.month, day: parts.day,
    hour: parts.hour, minute: parts.minute, second: parts.second,
    offsetMinutes,
  }
}

/**
 * The instant a local reading means: read the wall clock, take the offset that
 * is in force there, and shift back by it.
 */
export function localToInstant(zone, local) {
  const resolved = resolveZone(zone)
  const reading = normaliseLocal(local)
  const naive = epochFromParts(reading)
  const offsetMinutes = offsetAt(resolved, naive)
  const instant = naive - offsetMinutes * MS_PER_MINUTE
  return {
    instant,
    offsetMinutes: offsetAt(resolved, instant),
    resolution: 'exact',
    local: reading,
  }
}

export { SEARCH_WINDOW }
