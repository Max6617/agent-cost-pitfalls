/**
 * Deterministic clock for tests.
 *
 * The cache never calls `Date.now()` in a test: a suite that depends on wall
 * clock time is a suite that fails on a loaded CI box.
 */
export function fakeClock(start = 0) {
  let t = start
  return {
    now: () => t,
    advance(ms) {
      t += ms
      return t
    },
    set(value) {
      t = value
      return t
    },
  }
}

/** Run `fn` and report how long it took on the injected clock. */
export function timed(clock, fn) {
  const before = clock.now()
  const result = fn()
  return { result, elapsed: clock.now() - before }
}
