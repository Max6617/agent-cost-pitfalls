/**
 * The gateway never reads a real clock and never calls a real timer. Everything
 * time-shaped is injected: a clock is a function returning milliseconds, a sleep
 * is a function returning a promise. That is what makes a deadline testable at
 * an exact boundary instead of approximately.
 */

/** A clock the caller can move by hand. Starts at 0. */
export function createClock(start = 0) {
  let now = start
  const clock = () => now
  clock.set = (t) => {
    now = t
    return now
  }
  clock.advance = (by) => {
    now += by
    return now
  }
  return clock
}

/** A sleep that returns immediately. The default, and what tests want. */
export function immediateSleep() {
  return Promise.resolve()
}

/** A sleep that never settles: used when the token is the only way out. */
export function foreverSleep() {
  return new Promise(() => {})
}
