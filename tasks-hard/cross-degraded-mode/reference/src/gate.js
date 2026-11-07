/**
 * One breaker per dependency.
 *
 * The gate answers exactly one question — "may this call go out, right now?" —
 * and it answers it without performing the call. Recording the outcome is a
 * separate step, because the call site is the only thing that knows what the
 * transport returned.
 */

export const CLOSED = 'closed'
export const OPEN = 'open'
export const HALF_OPEN = 'half-open'

/** A gate wired to a clock. */
export function createGate(name, config, clock) {
  return new Gate(name, config, clock)
}

export class Gate {
  constructor(name, { failureThreshold = 3, failureWindow = 5, openMs = 30000 } = {}, clock) {
    if (!clock) throw new Error('gate ' + name + ': a clock must be injected')
    this.name = name
    this.clock = clock
    this.failureThreshold = failureThreshold
    this.failureWindow = failureWindow
    this.openMs = openMs
    this.state = CLOSED
    this.failures = []
    this.openedAt = null
    this.probes = 0
    this.trips = 0
    this.marked = false
  }

  /** True while the dependency is marked degraded by an operator. */
  get degraded() { return this.marked }

  /** True while the breaker itself is stopping calls. */
  get blocking() { return this.state !== CLOSED }

  /**
   * May the next call be attempted? A breaker that has been open for `openMs`
   * lets exactly one call through as the probe, and refuses everything else
   * until that probe reports back.
   */
  allows() {
    if (this.marked) return false
    const now = this.clock()
    if (this.state === OPEN) {
      if (now - this.openedAt < this.openMs) return false
      this.state = HALF_OPEN
      this.probes += 1
      this.openedAt = null
      return true
    }
    if (this.state === HALF_OPEN) return false
    return true
  }

  /** The probe answered: the dependency is back. */
  recordSuccess() {
    this.failures = []
    this.state = CLOSED
    this.openedAt = null
    return this
  }

  /** A call failed. Enough of them in a row opens the breaker. */
  recordFailure() {
    if (this.state === HALF_OPEN) {
      this.open(this.clock())
      return this
    }
    this.failures.push(1)
    if (this.failures.length > this.failureWindow) this.failures = this.failures.slice(-this.failureWindow)
    if (this.failures.length >= this.failureThreshold) this.open(this.clock())
    return this
  }

  open(now) {
    this.state = OPEN
    this.openedAt = now
    this.failures = []
    this.trips += 1
    return this
  }

  /** Mark degraded, whatever the breaker thinks. */
  markDegraded() { this.marked = true; return this }

  /** Clear the mark and the breaker: the dependency is considered healthy again. */
  markHealthy() {
    this.marked = false
    this.failures = []
    this.state = CLOSED
    this.openedAt = null
    return this
  }

  snapshot() {
    return { state: this.state, marked: this.marked, degraded: this.degraded || this.blocking, failures: this.failures.length, openedAt: this.openedAt }
  }
}
