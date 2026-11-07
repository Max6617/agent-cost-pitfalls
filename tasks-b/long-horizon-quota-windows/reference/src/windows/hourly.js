/**
 * The per-key hourly burst window.
 *
 * Requests are throttled to `hourlyLimit` units of cost per sliding hour
 * (docs/quota-rules.md section 4): at time t, every admitted request stamped
 * in (t - 3600, t] still weighs. The window is kept as the list of admitted
 * requests it currently spans; entries that have aged out of it are dropped
 * as the window moves forward.
 */
import { HOUR } from '../util/time.js'

export class HourWindow {
  constructor() {
    this.events = []
  }

  /** Record an admitted request. */
  record(at, cost) {
    this.events.push({ at, cost })
  }

  /** The usage weighing against a request stamped `at`. */
  used(at) {
    let total = 0
    for (const event of this.events) {
      if (event.at > at - HOUR) total += event.cost
    }
    return total
  }

  /** Forget requests that have aged out of the window. */
  prune(at) {
    this.events = this.events.filter((event) => event.at > at - HOUR)
  }

  /** Throw the whole window away. */
  reset() {
    this.events = []
  }
}
