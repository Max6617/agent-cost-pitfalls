/**
 * Offset lookup.
 *
 * The table lists, per zone, the instant at which each offset starts, in
 * ascending order. Walk it and keep the last offset that has started.
 */
import { resolveZone } from './zones.js'

/** The offset in force at `instant`, in minutes east of UTC. */
export function offsetAt(zone, instant) {
  const resolved = resolveZone(zone)
  let offset = resolved.initialOffsetMinutes
  for (const transition of resolved.transitions) {
    if (instant <= transition.at) break
    offset = transition.offsetMinutes
  }
  return offset
}
