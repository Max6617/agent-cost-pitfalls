/**
 * Offset lookup.
 *
 * The table lists, per zone, the instant at which each offset starts. An offset
 * holds from its own instant until the instant of the next one, and the
 * transition instant itself already belongs to the new offset.
 */
import { resolveZone } from './zones.js'

/**
 * The offset in force at `instant`, in minutes east of UTC.
 * Any zone the table does not know throws (see zones.js).
 */
export function offsetAt(zone, instant) {
  const resolved = resolveZone(zone)
  let offset = resolved.initialOffsetMinutes
  for (const transition of resolved.transitions) {
    if (instant < transition.at) break
    offset = transition.offsetMinutes
  }
  return offset
}
