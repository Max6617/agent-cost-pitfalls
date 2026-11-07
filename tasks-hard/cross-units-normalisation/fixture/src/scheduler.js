import { MS_PER_SECOND } from './units.js'

/**
 * The tick clock.
 *
 * The scheduler does not run anything: it answers where the ticks fall between
 * now and a horizon, which is what the catch-up planner consumes.
 */
export class Scheduler {
  constructor({ tickMs = 1000 } = {}) {
    this.tickMs = tickMs
  }

  /** Every tick from 0 up to the horizon; the horizon itself is not a tick. */
  ticksUntil(horizonMs) {
    const stepMs = this.tickMs / MS_PER_SECOND
    const ticks = []
    for (let at = 0; at < horizonMs; at += stepMs) ticks.push(at)
    return ticks
  }

  countUntil(horizonMs) {
    return this.ticksUntil(horizonMs).length
  }
}
