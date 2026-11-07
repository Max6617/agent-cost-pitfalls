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
    const ticks = []
    for (let at = 0; at < horizonMs; at += this.tickMs) ticks.push(at)
    return ticks
  }

  countUntil(horizonMs) {
    return this.ticksUntil(horizonMs).length
  }
}
