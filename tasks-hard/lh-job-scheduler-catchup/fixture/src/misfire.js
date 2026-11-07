/**
 * Misfire handling.
 *
 * A run discovered long after the instant it was scheduled for is not replayed:
 * it is recorded and the job carries on. How long "long" is belongs to the job.
 */
import { DAY } from './time.js'

/** The nominal gap between two consecutive runs of a job. */
function runPeriodMs(schedule) {
  return schedule.kind === 'interval' ? schedule.everyMs : DAY
}

/** How long a run has been due at the tick instant. */
export function lateBy(at, now) {
  return now - at
}

/**
 * Whether the run scheduled for `at` is too old to start at `now`.
 *
 * `misfireAfterMs: 0` (or nothing) switches the window off: the run is late but
 * the job said it does not care.
 */
export function isMisfired(job, at, now) {
  const window = Number(job.misfireAfterMs ?? 0)
  if (!(window > 0)) return false
  return lateBy(at - runPeriodMs(job.schedule), now) > window
}
