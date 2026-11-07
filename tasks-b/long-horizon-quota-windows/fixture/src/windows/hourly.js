/**
 * The per-key hourly burst window.
 *
 * Requests are throttled to `hourlyLimit` units of cost per hour (see
 * docs/quota-rules.md section 4). The window is kept as a tally per clock
 * hour: recording a request adds its cost to the tally for the hour it
 * landed in, and asking for the current usage reads the tally of the hour
 * the request belongs to. Tallies for hours that can never be consulted
 * again are dropped as the window moves forward.
 */
import { bucketOf } from '../util/time.js'

export class HourWindow {
  constructor() {
    this.tallies = new Map()
  }

  /** Record an admitted request. */
  record(at, cost) {
    const bucket = bucketOf(at)
    this.tallies.set(bucket, (this.tallies.get(bucket) ?? 0) + cost)
  }

  /** The usage weighing against a request stamped `at`. */
  used(at) {
    return this.tallies.get(bucketOf(at)) ?? 0
  }

  /** Forget tallies too old to matter. */
  prune(at) {
    const current = bucketOf(at)
    for (const bucket of this.tallies.keys()) {
      if (bucket < current) this.tallies.delete(bucket)
    }
  }

  /** Throw the whole window away. */
  reset() {
    this.tallies.clear()
  }
}
