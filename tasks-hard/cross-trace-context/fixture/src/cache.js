/**
 * A read-through cache in front of the repository.
 *
 * `lookup` returns a hit or a miss and reports which one it was. The record that
 * was stored is returned as it was stored - the cache is not allowed to rewrite
 * it - and the event that reports the hit belongs to the request that hit it.
 *
 * The cache is deliberately context-blind: it is handed an emitter and calls it.
 * Keeping the request context on the events is the emitter's job, not the
 * cache's, which is why the cache never touches the context module.
 */
export function createCache({ events, max = 100 } = {}) {
  const entries = new Map()

  const report = (name, meta) => {
    if (events) events.emitWith(null, { name, meta })
  }

  return {
    lookup(key) {
      const entry = entries.get(key)
      if (entry) {
        report('cache.hit', { key, storedAt: entry.at })
        return { hit: true, record: { ...entry.record } }
      }
      report('cache.miss', { key })
      return { hit: false, record: undefined }
    },

    store(key, record, at) {
      if (entries.size >= max && !entries.has(key)) {
        const oldest = entries.keys().next().value
        entries.delete(oldest)
      }
      entries.set(key, { record: { ...record }, at })
      return { ...record }
    },

    drop(key) {
      return entries.delete(key)
    },

    keys() {
      return [...entries.keys()]
    },

    get size() {
      return entries.size
    },
  }
}
