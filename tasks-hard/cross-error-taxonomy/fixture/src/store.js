/**
 * The in-memory store. The dev server runs on it, and the API tests use it with
 * a broken method spliced in when they want a dependency failure.
 *
 * A store is `read(id)`, `write(record)` and `list()`; any of them may throw.
 */
export function createMemoryStore(seed = []) {
  const records = new Map()
  for (const record of seed) records.set(record.id, { ...record })

  return {
    read(id) {
      const record = records.get(id)
      return record ? { ...record } : undefined
    },
    write(record) {
      records.set(record.id, { ...record })
      return { ...record }
    },
    list() {
      return [...records.values()].map((record) => ({ ...record }))
    },
  }
}
