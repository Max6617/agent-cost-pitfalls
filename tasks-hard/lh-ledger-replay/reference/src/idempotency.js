/**
 * Idempotency keys.
 *
 * The importer is allowed to retry: it re-reads the same source file, and the
 * same key arrives again - not necessarily next to the first copy, and not
 * necessarily in the same batch. A key is remembered for the life of the
 * journal.
 */
export function createIndex() {
  const keys = new Set()
  return {
    /** Has this key already been taken? */
    has(key) {
      if (key === undefined || key === null) return false
      return keys.has(String(key))
    },
    /** Take the key. */
    add(key) {
      if (key === undefined || key === null) return
      keys.add(String(key))
    },
    /** How many distinct keys have been taken. */
    size() {
      return keys.size
    },
  }
}
