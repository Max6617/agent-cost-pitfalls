/**
 * The repository layer.
 *
 * Reads a record, optionally waits on an injected hook so that a caller can
 * interleave two reads deterministically, and reports what it did. It runs in
 * whatever span is in flight; it does not open one.
 */
import { NotFoundError } from './errors.js'

export function createRepository({ records = [], hooks = {}, events } = {}) {
  const table = new Map(records.map((r) => [r.id, { ...r }]))
  let reads = 0
  let writes = 0

  return {
    async get(id) {
      reads += 1
      const hook = hooks[id]
      if (typeof hook === 'function') await hook()
      const record = table.get(id)
      if (!record) {
        throw new NotFoundError('no record ' + id, { details: { id } })
      }
      return { ...record }
    },

    async put(record) {
      if (!record || typeof record.id !== 'string') {
        throw new TypeError('a record needs an id')
      }
      writes += 1
      table.set(record.id, { ...record })
      return { ...record }
    },

    all() {
      return [...table.values()].map((r) => ({ ...r }))
    },

    get reads() {
      return reads
    },

    get writes() {
      return writes
    },
  }
}
