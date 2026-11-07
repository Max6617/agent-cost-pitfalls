/**
 * Cache plans.
 *
 * A tiny in-process store standing in for the real one; the plan shape the
 * driver sees is what matters here. Cache calls are cheap, so the caller's
 * number goes on the plan as asked and only the no-preference case picks the
 * usual 250ms.
 */

const DEFAULT_TIMEOUT_MS = 250

export function createCache() {
  const store = new Map()

  return {
    /** Read a key; the plan reports whether it was there. */
    get(key, { timeout } = {}) {
      const timeoutMs = timeout ?? DEFAULT_TIMEOUT_MS
      const hit = store.has(key)
      return { hit, value: hit ? store.get(key) : undefined, timeoutMs }
    },

    /** Write a key. */
    set(key, value, { timeout } = {}) {
      const timeoutMs = timeout ?? DEFAULT_TIMEOUT_MS
      store.set(key, value)
      return { stored: true, timeoutMs }
    },
  }
}
