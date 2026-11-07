/**
 * Materialised period totals.
 *
 * Computing a period across a long journal is the expensive part of the close,
 * so a computed total is kept and handed back on the next request for the same
 * period. The nightly close job rebuilds the whole thing from scratch; during
 * the day the same process serves the same periods over and over.
 */
export function createStore() {
  const cache = new Map()
  return {
    get(period) {
      return cache.has(period) ? cache.get(period) : null
    },
    set(period, value) {
      cache.set(period, value)
    },
    clear() {
      cache.clear()
    },
    size() {
      return cache.size
    },
    periods() {
      return [...cache.keys()].sort()
    },
  }
}
