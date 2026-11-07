/**
 * Misfire handling.
 *
 * A run discovered long after the instant it was scheduled for is not replayed:
 * it is recorded and the job carries on. How long "long" is belongs to the job.
 */

/** How long a run has been due at the tick instant. */
export function lateBy(at, now) {
  return now - at
}

/**
 * Whether the run scheduled for `at` is too old to start at `now`.
 *
 * The age is measured from the run's own instant: a run is late by how long it
 * has been waiting, not by how long ago the previous run was due. The boundary
 * belongs to the run, so a run exactly `misfireAfterMs` late is still on time.
 * `misfireAfterMs: 0` (or nothing) switches the window off.
 */
export function isMisfired(job, at, now) {
  const window = Number(job.misfireAfterMs ?? 0)
  if (!(window > 0)) return false
  return lateBy(at, now) > window
}
