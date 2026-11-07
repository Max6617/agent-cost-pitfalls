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
    this.budgetMs = budgetMs
  }

  /** How long to wait before retry `n`. The first retry waits one base delay. */
  backoffMs(n) {
    if (n <= 0) return 0
    return Math.min(this.baseBackoffMs * 2 ** (n - 1), this.maxBackoffMs)
  }

  /**
   * How many attempts fit in what is left of the budget.
   *
   * Each attempt costs its own timeout, and every attempt after the first costs
   * the wait before it as well, so the answer is the largest count whose whole
   * cost still fits in the remaining budget.
   */
  schedule({ perAttemptTimeoutMs, spentMs = 0 }) {
    const remaining = this.budgetMs - spentMs
    let attempts = 0
    let totalMs = 0
    while (attempts < this.attempts) {
      const next = totalMs + this.backoffMs(attempts) + perAttemptTimeoutMs
      if (next > remaining) break
      attempts += 1
      totalMs = next
    }
    return {
      allowed: attempts >= 1,
      attempts,
      totalMs,
      reason: attempts >= 1 ? 'ok' : 'budget',
    }
  }
}
