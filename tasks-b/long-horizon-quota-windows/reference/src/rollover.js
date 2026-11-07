/**
 * Rolling both windows forward to an event's timestamp.
 *
 * The daily window rolls over at day boundaries; the hourly window slides
 * continuously across them and only needs its aged-out entries dropped.
 * Both move with the timestamps the events carry, never with a clock.
 */
import { dayOf } from './util/time.js'

export function advanceWindows(daily, hourly, at) {
  daily.advanceTo(dayOf(at))
  hourly.prune(at)
}
