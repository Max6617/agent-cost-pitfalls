/**
 * Idempotency keys.
 *
 * The importer is allowed to retry: it re-reads the same source file, and the
 * same key arrives again. A key that has been accepted before must not be
 * accepted twice.
 */
export function createIndex() {
  let last = null
  return {
    /** Has this key already been taken? */
    has(key) {
      if (key === undefined || key === null) return false
      return last === key
    },
    /** Take the key. */
    add(key) {
      if (key === undefined || key === null) return
      last = key
    },
    /** How many distinct keys have been taken. */
    size() {
      return last === null ? 0 : 1
    },
  }
}
