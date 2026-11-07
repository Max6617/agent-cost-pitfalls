/**
 * The document store.
 *
 * Documents are kept as they were written, keyed by id, next to the analysed
 * length of each one. Scoring needs the mean length of the corpus on every
 * comparison, so it is kept rather than recomputed per call.
 */
import { compareIds } from './util/text.js'

export function createDocuments() {
  const byId = new Map()
  const lengths = new Map()
  let meanLength = null

  function size() {
    return byId.size
  }

  function ids() {
    return [...byId.keys()].sort(compareIds)
  }

  function averageLength() {
    if (meanLength === null) {
      let total = 0
      for (const length of lengths.values()) total += length
      meanLength = size() ? total / size() : 0
    }
    return meanLength
  }

  /** Called whenever the contents change. */
  function invalidateLengths() {
    meanLength = null
  }

  return {
    size,
    ids,
    averageLength,
    invalidateLengths,

    has(id) {
      return byId.has(id)
    },

    get(id) {
      return byId.get(id)
    },

    all() {
      return ids().map((id) => byId.get(id))
    },

    put(id, document) {
      byId.set(id, document)
    },

    drop(id) {
      lengths.delete(id)
      return byId.delete(id)
    },

    setLength(id, length) {
      lengths.set(id, length)
    },

    lengthOf(id) {
      return lengths.get(id) ?? 0
    },
  }
}
