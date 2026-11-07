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
 * the question.
 */
export function createCache(backing) {
  return {
    lookup(key, loader, { ctx } = {}) {
      let cached
      try {
        cached = backing.get(key)
      } catch {
        cached = undefined
      }
      if (cached !== undefined) return { value: cached, hit: true }

      try {
        const value = loader()
        backing.set(key, value)
        return { value, hit: false }
      } catch (cause) {
        throw wrap(cause, 'CACHE_ERROR', { ctx })
      }
    },
  }
}
