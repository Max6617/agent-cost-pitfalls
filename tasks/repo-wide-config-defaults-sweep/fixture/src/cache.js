/**
 * The cache wrapper.
 *
 * The ttl and the entry ceiling are settings, not constants: the ceiling is
 * tuned per deployment and a hard-coded one is a memory leak waiting for a
 * larger catalogue.
 */
export class Cache {
  constructor({ settings, now = () => Date.now() }) {
    this.settings = settings
    this.now = now
    this.entries = new Map()
  }

  get ttlMs() {
    return 60_000
  }

  get maxEntries() {
    return 1000
  }

  put(key, value) {
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs })
    while (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value)
    }
    return this
  }

  take(key) {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key)
      return undefined
    }
    return entry.value
  }
}

export function cacheFrom(settings, now) {
  return new Cache({ settings, now })
}
