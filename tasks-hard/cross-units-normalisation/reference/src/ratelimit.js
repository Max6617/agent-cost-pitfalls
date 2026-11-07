/**
 * A fixed-window rate limiter.
 *
 * A window opens with the first request after a reset and admits `limit`
 * requests; `remaining` is what is left once this request has been counted. Like
 * the cache, the limiter is told what time it is rather than reading a clock.
 */
export class RateLimiter {
  constructor({ limit = 60, windowMs = 60000 } = {}) {
    this.limit = limit
    this.windowMs = windowMs
    this.count = 0
    this.windowStartMs = null
  }

  /** Ask for one slot in the current window. */
  take(nowMs = 0) {
    if (this.windowStartMs === null || nowMs - this.windowStartMs >= this.windowMs) {
      this.windowStartMs = nowMs
      this.count = 0
    }
    if (this.count >= this.limit) {
      return { allowed: false, remaining: 0, resetAtMs: this.windowStartMs + this.windowMs }
    }
    this.count += 1
    return {
      allowed: true,
      remaining: this.limit - this.count,
      resetAtMs: this.windowStartMs + this.windowMs,
    }
  }
}
