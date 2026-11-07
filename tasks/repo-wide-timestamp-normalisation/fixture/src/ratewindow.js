/**
 * Rate-limit bookkeeping.
 *
 * A window is a list of call timestamps. The window is trimmed on every record
 * rather than on a timer, so the count is only ever as stale as the last call.
 */
import { toTimestamp } from './timestamps.js'

export class RateWindow {
  constructor({ limit, windowMs, clock = () => Date.now() }) {
    this.limit = limit
    this.windowMs = windowMs
    this.clock = clock
    this.calls = []
  }

  /** Record a call and say whether it is allowed. */
  record() {
    const now = this.clock()
    this.calls.push(new Date(now).toISOString())
    this.calls = this.calls.filter((at) => now - Date.parse(at) < this.windowMs)
    return { allowed: this.calls.length <= this.limit, count: this.calls.length }
  }

  /** The oldest call still inside the window. */
  oldest() {
    return this.calls[0] ?? null
  }

  /** When the next call would be allowed again. */
  retryAfterMs() {
    const oldest = this.oldest()
    if (!oldest) return 0
    return Math.max(0, this.windowMs - (this.clock() - Date.parse(oldest)))
  }
}
