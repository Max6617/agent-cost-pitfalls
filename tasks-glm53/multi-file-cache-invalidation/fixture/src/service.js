import { loadFeed } from './feed.js'

/**
 * The service the API talks to.
 *
 * `read` serves from the cache when it can and loads otherwise. A write goes
 * through `write`, which invalidates whatever the feed depends on — the whole
 * point of the cache is that a write is rare and a read is not.
 */
export class FeedService {
  /**
   * @param {{ cache: import('./cache.js').FeedCache,
   *           reader: { read(): object[] },
   *           logger?: (event: object) => void }} deps
   */
  constructor({ cache, reader, logger = () => {} }) {
    this.cache = cache
    this.reader = reader
    this.logger = logger
    this.reads = 0
    this.loads = 0
    this.inflight = new Map()
  }

  /**
   * The feed for a key.
   *
   * Two callers asking for the same key at the same time share one load: the
   * in-flight promise is cached under the same key, so the second caller awaits
   * the first one's work instead of starting a second pass over the rows.
   */
  async read(key = 'default') {
    this.reads += 1

    const cached = this.cache.get(key)
    if (cached !== undefined) return cached

    this.loads += 1
    const raw = await this.reader.read()
    const feed = loadFeed(raw)
    this.cache.set(key, feed)
    this.logger({ event: 'feed.loaded', key, size: feed.size })
    return feed
  }

  /**
   * Apply a change and invalidate.
   *
   * The writer is given the current feed so it can compute the next one; the
   * cache is dropped before the change lands so that nothing can read the old
   * value while the write is in progress.
   */
  async write(key, change) {
    const current = await this.read()
    const next = change(current)
    this.cache.invalidate(key, 'write')
    this.cache.setIfCurrent(key, next, this.cache.generation)
    this.logger({ event: 'feed.written', key, size: next.size })
    return next
  }

  /** Force a reload on the next read. */
  invalidate(key, reason = 'manual') {
    this.cache.invalidate(key, reason)
  }

  stats() {
    return { reads: this.reads, loads: this.loads, ...this.cache.stats() }
  }
}
