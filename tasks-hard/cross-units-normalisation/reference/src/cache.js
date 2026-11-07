/**
 * A small time-aware map.
 *
 * The cache owns no clock: every call takes the current time, so a test can ask
 * what the cache would say at any moment. An entry that has reached its TTL is
 * gone the next time anyone looks at it.
 */
import { MS_PER_SECOND } from './units.js'

export class Cache {
  constructor({ ttlMs = 60000, maxEntries = Infinity } = {}) {
    this.ttlMs = ttlMs
    this.maxEntries = maxEntries
    this.entries = new Map()
  }

  set(key, value, nowMs = 0) {
    if (this.entries.has(key)) this.entries.delete(key)
    this.entries.set(key, { value, storedAtMs: nowMs })
    while (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value)
    }
    return this
  }

  get(key, nowMs = 0) {
    const hit = this.entries.get(key)
    if (!hit) return undefined
    if (nowMs - hit.storedAtMs >= this.ttlMs) {
      this.entries.delete(key)
      return undefined
    }
    return hit.value
  }

  has(key, nowMs = 0) {
    return this.get(key, nowMs) !== undefined
  }

  stats() {
    return {
      entries: this.entries.size,
      ttlMs: this.ttlMs,
      // A lifetime is published rounded up: it is never reported as shorter
      // than it is.
      ttlSeconds: Math.ceil(this.ttlMs / MS_PER_SECOND),
    }
  }
}
