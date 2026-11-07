/**
 * A tiny request path over the cache, so the cache is exercised the way the
 * server uses it rather than only through unit calls.
 */
import { ResponseCache } from './cache.js'

export class RequestPath {
  constructor(options) {
    this.cache = new ResponseCache(options)
    this.upstreamCalls = 0
  }

  /** The pre-flight check: presence only, no promotion. */
  isWarm(key) {
    return this.cache.has(key)
  }

  /** Fetch through the cache. */
  fetch(key, produce) {
    const cached = this.cache.get(key)
    if (cached !== undefined) return cached

    this.upstreamCalls += 1
    const value = produce(key)
    this.cache.set(key, value)
    return value
  }

  stats() {
    return { ...this.cache.stats(), upstreamCalls: this.upstreamCalls }
  }
}
