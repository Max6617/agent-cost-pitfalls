/**
 * Instant <-> local reading.
 *
 * A zone's offset is a function of the instant, so an instant is easy: shift it
 * and read the fields off the shifted value. The other direction is the one with
 * the awkward cases, because a wall clock is not always a time that happened:
 * an hour disappears every spring and repeats every autumn. docs/time-rules.md
 * §5 fixes what those mean here.
 */
import { resolveZone } from './zones.js'
import { offsetAt } from './offsets.js'
import {
  MS_PER_MINUTE, MS_PER_DAY, MS_PER_HOUR, epochFromParts, partsFromEpoch, normaliseLocal,
} from './civil.js'

// How far from the reading (read as UTC) an instant worth considering can be.
// The widest real offsets are under 15 hours, and no gap is wider than two, so a
// day either side is generous.
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

function sameReading(a, b) {
  return a.year === b.year && a.month === b.month && a.day === b.day
    && a.hour === b.hour && a.minute === b.minute && a.second === b.second
}

/**
 * Every offset that could apply to `reading`, given that the instant behind it
 * is within SEARCH_WINDOW of the reading taken as UTC.
 */
function candidateOffsets(zone, naive) {
  const offsets = new Set()
  offsets.add(offsetAt(zone, naive - SEARCH_WINDOW))
  offsets.add(offsetAt(zone, naive + SEARCH_WINDOW))
  for (const transition of zone.transitions ?? []) {
    if (transition.at > naive - SEARCH_WINDOW && transition.at < naive + SEARCH_WINDOW) {
      offsets.add(transition.offsetMinutes)
      offsets.add(offsetAt(zone, transition.at - 1))
    }
  }
  return [...offsets]
}

/** The offset just before a transition, i.e. the one the transition replaces. */
function offsetBefore(zone, transition) {
  return offsetAt(zone, transition.at - 1)
}

/**
 * The instant a local reading means.
 *
 * `resolution` is `'exact'`, `'ambiguous'` (the reading happens twice and the
 * earlier instant is the answer) or `'nonexistent'` (the reading is inside a
 * gap and the answer is the reading advanced by the length of that gap).
 */
export function localToInstant(zone, local) {
  const resolved = resolveZone(zone)
  const reading = normaliseLocal(local)
  const naive = epochFromParts(reading)

  const hits = []
  for (const offset of candidateOffsets(resolved, naive)) {
    const instant = naive - offset * MS_PER_MINUTE
    if (sameReading(instantToLocal(resolved, instant), reading)) hits.push(instant)
  }

  if (hits.length === 1) {
    return { instant: hits[0], offsetMinutes: offsetAt(resolved, hits[0]), resolution: 'exact', local: reading }
  }
  if (hits.length > 1) {
    const instant = Math.min(...hits)
    return { instant, offsetMinutes: offsetAt(resolved, instant), resolution: 'ambiguous', local: reading }
  }

  // No offset makes this reading real, so it is inside a gap. Advancing the
  // reading by the length of the gap lands on the same instant as reading it
  // with the offset that was in force before the gap.
  for (const transition of resolved.transitions ?? []) {
    const before = offsetBefore(resolved, transition)
    const gap = transition.offsetMinutes - before
    if (gap <= 0) continue
    const instant = naive - before * MS_PER_MINUTE
    if (instant >= transition.at && instant < transition.at + gap * MS_PER_MINUTE) {
      return {
        instant,
        offsetMinutes: offsetAt(resolved, instant),
        resolution: 'nonexistent',
        local: reading,
      }
    }
  }

  // Not reachable with a well-formed table: every reading is either real for
  // some candidate offset or inside some gap. Kept so that a table edited by
  // hand cannot make this function return undefined.
  const instant = naive - offsetAt(resolved, naive) * MS_PER_MINUTE
  return { instant, offsetMinutes: offsetAt(resolved, instant), resolution: 'exact', local: reading }
}

export { SEARCH_WINDOW }
