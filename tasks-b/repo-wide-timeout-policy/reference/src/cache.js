/**
 * Cache plans.
 *
 * A tiny in-process store standing in for the real one; the plan shape the
 * driver sees is what matters here. Both operations resolve through the
 * policy like every other client's.
 */
export function createCache({ policy }) {
  const store = new Map()

  return {
    /** Read a key; the plan reports whether it was there. */
    get(key, { timeout } = {}) {
      const timeoutMs = policy.resolve('cache.get', timeout)
      const hit = store.has(key)
      return { hit, value: hit ? store.get(key) : undefined, timeoutMs }
    },

    /** Write a key. */
    set(key, value, { timeout } = {}) {
      const timeoutMs = policy.resolve('cache.set', timeout)
      store.set(key, value)
      return { stored: true, timeoutMs }
    },
  }
}
