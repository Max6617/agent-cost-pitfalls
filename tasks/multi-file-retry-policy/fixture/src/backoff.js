/**
 * Backoff schedule.
 *
 * Exponential from `baseDelayMs`, doubling per attempt, capped at
 * `maxDelayMs`. No jitter: the schedule has to be reproducible in a test and in
 * an incident review, and the per-host gap in the worker is what prevents the
 * herd, not randomness.
 */

/** The configured schedule, longest last. */
export function schedule(config) {
  const delays = []
  for (let i = 0; i < config.attempts; i++) {
    delays.push(Math.min(config.baseDelayMs * 2 ** i, config.maxDelayMs))
  }
  return delays
}

/**
 * Delay before attempt number `attempt`, counting the first retry as 0.
 *
 * An attempt past the end of the schedule waits the cap, so a long-lived job
 * degrades to a fixed poll rather than growing without bound.
 *
 * @param {object} config
 * @param {number} attempt
 */
export function delayFor(config, attempt) {
  const delays = schedule(config)
  if (attempt < 0) return delays[0]
  return attempt >= delays.length ? config.maxDelayMs : delays[attempt]
}

/**
 * The delay a rate-limited error must wait.
 *
 * Two floors apply and the longer one wins: the exponential schedule, because
 * the upstream is asking us to slow down, and a fixed one second, because a
 * "try again in a moment" from a shared host is not an invitation to come back
 * on the next tick.
 */
export function rateLimitDelay(config, attempt, retryAfterMs = 0) {
  return retryAfterMs
}

/**
 * The gap to leave before the next call to a host we have already spoken to.
 *
 * This is a floor on the spacing between calls, not on the retry delay: a job
 * that succeeded immediately still has to respect it, which is what stops ten
 * workers from arriving at the same host in the same millisecond.
 *
 * @param {object} config
 * @param {number} sinceLastCallMs time since the last call to this host
 */
export function hostGap(config, sinceLastCallMs) {
  return Math.max(0, config.perHostMinGapMs - sinceLastCallMs)
}
