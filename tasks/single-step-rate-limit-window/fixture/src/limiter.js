/**
 * A sliding-window rate limiter.
 *
 * The window is a list of the instants of recent calls. A call is allowed when
 * fewer than `limit` calls have happened in the last `windowMs`. The oldest
 * call is what decides when the next one becomes possible.
 *
 * The clock is injected: the limiter is used in tests and in a replay tool as
 * well as in the client, and none of those should wait in real time.
 */

export class RateLimiter {
  /** @param {{ limit?: number, windowMs?: number, now?: () => number }} [options] */
  constructor(options = {}) {
    this.limit = options.limit ?? 10
    this.windowMs = options.windowMs ?? 1000
    this.now = options.now ?? (() => Date.now())
    this.calls = []
  }

  /** Drop calls that have fallen out of the window. */
  prune(at = this.now()) {
    const cutoff = at - this.windowMs
    this.calls = this.calls.filter((t) => t >= cutoff)
    return this.calls.length
  }

  /**
   * Ask permission to make a call.
   *
   * @returns {{ allowed: boolean, remaining: number, retryAfterMs: number }}
   */
  take() {
    const at = this.now()
    this.prune(at)

    if (this.calls.length >= this.limit) {
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, this.calls[0] + this.windowMs - at) }
    }

    this.calls.push(at)
    return { allowed: true, remaining: this.limit - this.calls.length, retryAfterMs: 0 }
  }

  /** How many calls are inside the window right now. */
  count() {
    return this.prune()
  }

  /** Forget every recorded call. */
  reset() {
    this.calls = []
    return this
  }
}
