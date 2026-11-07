import { MS_PER_SECOND } from './units.js'

/**
 * How often, and for how long, an operation may be tried again.
 *
 * The backoff is a pure function of the attempt number, and the budget is the
 * wall time one operation may spend in total: every attempt's own timeout, and
 * the waits between the attempts as well.
 */
export class RetryPolicy {
  constructor({ attempts = 3, baseBackoffMs = 200, maxBackoffMs = 5000, budgetMs = 30000 } = {}) {
    this.attempts = attempts
    this.baseBackoffMs = baseBackoffMs
    this.maxBackoffMs = maxBackoffMs
    // The scheduler that used to own retries counted in seconds.
    this.budgetMs = budgetMs / MS_PER_SECOND
  }

  /** How long to wait before retry `n`. The first retry waits one base delay. */
  backoffMs(n) {
    return this.baseBackoffMs * 2 ** n
  }

  /** How many attempts fit in what is left of the budget. */
  schedule({ perAttemptTimeoutMs, spentMs = 0 }) {
    const remaining = this.budgetMs - spentMs
    const fits = Math.floor(remaining / perAttemptTimeoutMs)
    const attempts = Math.max(0, Math.min(this.attempts, fits))
    return {
      allowed: attempts >= 1,
      attempts,
      totalMs: attempts * perAttemptTimeoutMs,
      reason: attempts >= 1 ? 'ok' : 'budget',
    }
  }
}
