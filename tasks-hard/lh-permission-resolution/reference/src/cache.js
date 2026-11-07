/**
 * The decision cache.
 *
 * `authorize()` is on the hot path of every gateway request and the same few
 * questions are asked over and over — one page load is a dozen checks of the
 * same subject against the same project. The cache is a small FIFO map rather
 * than an LRU because the working set is one request wide.
 *
 * A cached decision is only good for the graph that produced it, which is what
 * the generation counter is for: an edit bumps the generation and every entry
 * written against the old one is dead on arrival.
 *
 * The key is the whole question. Two resources that share a spelling prefix are
 * two different questions and must never share an entry.
 */
export function decisionKey(subjectId, action, resource) {
  return subjectId + '\u0000' + action + '\u0000' + resource
}

export function createDecisionCache(limit = 500) {
  const entries = new Map()

  return {
    get(key, generation) {
      const entry = entries.get(key)
      if (!entry) return undefined
      if (entry.generation !== generation) {
        entries.delete(key)
        return undefined
      }
      return entry.value
    },

    set(key, generation, value) {
      if (entries.size >= limit) entries.delete(entries.keys().next().value)
      entries.set(key, { generation, value })
    },

    size() {
      return entries.size
    },

    clear() {
      entries.clear()
    },
  }
}
