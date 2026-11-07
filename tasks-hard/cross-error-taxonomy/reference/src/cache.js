import { wrap } from './errors.js'

/** The backing store the dev server and the tests hand to the cache. */
export function createMemoryCache() {
  const entries = new Map()
  return {
    get(key) {
      return entries.get(key)
    },
    set(key, value) {
      entries.set(key, value)
    },
  }
}

/**
 * The read-through cache in front of the repository.
 *
 * The cache is an optimisation: it is consulted before the source of truth, and
 * whatever the loader is (a repository read, usually) is what actually answers
 * the question. A cache that cannot be consulted is reported, because the
 * alternative is every cache incident becoming a store incident; a cache that
 * cannot be written to is not, because the value is already in hand.
 */
export function createCache(backing) {
  return {
    lookup(key, loader, { ctx } = {}) {
      let cached
      try {
        cached = backing.get(key)
      } catch (cause) {
        throw wrap(cause, 'DEPENDENCY_UNAVAILABLE', { ctx })
      }
      if (cached !== undefined) return { value: cached, hit: true }

      // The loader is the operation that answers the question: its failure is
      // the failure, and it is not this module's to re-label.
      const value = loader()
      try {
        backing.set(key, value)
      } catch {
        // nothing is lost: the value is already in hand
      }
      return { value, hit: false }
    },
  }
}
