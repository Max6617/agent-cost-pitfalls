/**
 * Retries.
 *
 * A failed run is attempted again with a growing delay until the job's attempt
 * budget is spent; the job is then parked rather than retried forever. Both the
 * size of the budget and the shape of the delay are part of the contract.
 */

/** How many times one run may be attempted in total. */
export function maxAttempts(job) {
  const configured = Number(job?.maxAttempts ?? 1)
  if (!Number.isFinite(configured)) return 1
  return Math.max(1, Math.trunc(configured))
}

/**
 * The wait before attempt number `attempt`, in milliseconds.
 *
 * Attempt 1 is the first attempt and has nothing to wait for; attempt n >= 2
 * waits `backoffMs * 2^(n-2)`, capped at `maxBackoffMs`.
 */
export function backoffFor(job, attempt) {
  const base = Number(job?.backoffMs ?? 0)
  const cap = Number(job?.maxBackoffMs ?? Number.POSITIVE_INFINITY)
  if (!Number.isFinite(base) || base <= 0) return 0
  if (!(attempt > 1)) return 0
  const delay = base * 2 ** (attempt - 2)
  return Number.isFinite(cap) ? Math.min(cap, delay) : delay
}
