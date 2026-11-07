/**
 * Rolling both windows forward to an event's timestamp.
 *
 * The daily window rolls over at day boundaries; the hourly window slides
 * continuously and only needs its stale tallies dropped. Both move with the
 * timestamps the events carry, never with a clock.
 */
import { dayOf } from './util/time.js'

export function advanceWindows(daily, hourly, at) {
  const previous = daily.day
  daily.advanceTo(dayOf(at))
  if (previous !== null && daily.day !== previous) {
    // A new day starts with clean windows.
    hourly.reset()
  }
  hourly.prune(at)
}
