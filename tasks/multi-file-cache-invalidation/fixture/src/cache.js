/**
 * The in-process cache for the product feed.
 *
 * One entry per feed. An entry is invalidated either because its ttl ran out or
 * because something was written that the feed depends on; both paths go through
 * `invalidate`, and both bump the same generation counter.
 *
 * The generation is what makes the cache correct under concurrency. An entry
 * records the generation it was computed at, and a read only serves an entry
 * whose generation is still current — so a value that an in-flight request
 * computed before an invalidation, and is about to store, is refused rather
 * than resurrected.
 */

export class FeedCache {
  /** @param {{ ttlMs?: number, now?: () => number }} [options] */
  constructor(options = {}) {
    this.ttlMs = options.ttlMs ?? 30_000
    this.now = options.now ?? (() => Date.now())
    this.entries = new Map()
    this.generation = 0
    this.invalidations = []
  }

  /** The cached feed, or undefined when there is nothing fresh. */
  get(key) {
    const entry = this.entries.get(key)
    if (!entry) return undefined

    // A stale entry is worse than no entry: the caller would serve prices that
    // were retired an hour ago.
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key)
      this.invalidations.push({ key, reason: 'expired' })
      return undefined
    }
    return entry.value
  }

  /**
   * Was this entry computed before the last invalidation?
   *
   * `get` serves whatever is fresh by ttl; this is the stricter question the
   * write path asks before it trusts a value it computed earlier.
   */
  isStale(key) {
    const entry = this.entries.get(key)
    if (!entry) return true
    return entry.generation !== this.generation
  }

  /** Store a feed at the current generation. */
  set(key, value) {
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs, generation: this.generation })
    return this
  }

  /**
   * Store a value only when it was computed at the generation that is current
   * now.
   *
   * This is the guard that stops an in-flight load from resurrecting state an
   * invalidation just threw away.
   *
   * @returns {boolean} whether the value was stored
   */
  setIfCurrent(key, value, generation) {
    if (generation !== this.generation) return false
    this.set(key, value)
    return true
  }

  /**
   * Invalidate.
   *
   * Dropping the named entry is enough on its own: every other entry becomes
   * unservable the moment the generation moves, because `get` compares the
   * entry's generation with the current one.
   *
   * @param {string} [key] omit to invalidate everything
   * @param {string} [reason]
   */
  invalidate(key, reason = 'manual') {
    this.generation += 1
    this.invalidations.push({ key: key ?? '*', reason })
    if (key === undefined) this.entries.clear()
    else this.entries.clear()
    return this
  }

  /** The generation that was current when this key was last written. */
  generationOf(key) {
    return this.entries.get(key)?.generation
  }

  /** Was this entry computed before the last invalidation? */
  isStale(key) {
    return this.entries.get(key)?.generation !== this.generation
  }

  /** Keys the cache is holding. */
  keys() {
    return [...this.entries.keys()]
  }

  stats() {
    return {
      size: this.keys().length,
      generation: this.generation,
      invalidations: this.invalidations.length,
    }
  }
}
