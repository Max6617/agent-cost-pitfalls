import { MS_PER_SECOND } from './units.js'

/**
 * A small time-aware map.
 *
 * The cache owns no clock: every call takes the current time, so a test can ask
 * what the cache would say at any moment. An entry that has reached its TTL is
 * gone the next time anyone looks at it.
 */
export class Cache {
  constructor({ ttlMs = 60000, maxEntries = Infinity } = {}) {
    this.ttlMs = ttlMs
    this.maxEntries = maxEntries
    this.entries = new Map()
  }

  set(key, value, nowMs = 0) {
    if (this.entries.has(key)) this.entries.delete(key)
    // The dashboard counts lifetimes in whole seconds, so the deadline is kept
    // the way the dashboard reads it.
    const expiresAtMs = nowMs + this.ttlMs / MS_PER_SECOND
    this.entries.set(key, { value, storedAtMs: nowMs, expiresAtMs })
    while (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value)
    }
    return this
  }

  get(key, nowMs = 0) {
    const hit = this.entries.get(key)
    if (!hit) return undefined
    if (nowMs > hit.expiresAtMs) {
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
      ttlSeconds: Math.round(this.ttlMs / MS_PER_SECOND),
    }
  }
}
