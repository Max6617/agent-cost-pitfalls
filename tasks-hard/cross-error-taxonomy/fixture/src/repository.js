import { wrap } from './errors.js'

/**
 * Records over an injected store. The store is the only thing that can fail
 * here that is not the caller's fault, and it may fail on any method.
 */
export function createRepository(store) {
  function findByKey(key) {
    return store.list().find((record) => record.idempotencyKey === key)
  }

  return {
    findById(id, { ctx } = {}) {
      try {
        return store.read(id)
      } catch (cause) {
        throw wrap(cause, 'INTERNAL', { ctx })
      }
    },

    insert(record, { ctx } = {}) {
      const key = record && typeof record.idempotencyKey === 'string' ? record.idempotencyKey : undefined
      if (key !== undefined) {
        const existing = findByKey(key)
        if (existing) return { created: false, record: existing }
      }
      return { created: true, record: store.write({ ...record, version: 1 }) }
    },

    update(id, patch, { ctx, expectedVersion } = {}) {
      const current = store.read(id)
      if (!current) throw new Error('there is no record ' + id)
      return store.write({ ...current, ...patch, id, version: current.version + 1 })
    },
  }
}
