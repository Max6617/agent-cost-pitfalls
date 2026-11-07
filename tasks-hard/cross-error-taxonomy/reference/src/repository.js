import { domainError, wrap } from './errors.js'

/**
 * Records over an injected store. The store is the only thing that can fail
 * here that is not the caller's fault, and it may fail on any method.
 */
export function createRepository(store) {
  function viaStore(work, ctx) {
    try {
      return work()
    } catch (cause) {
      throw wrap(cause, 'DEPENDENCY_UNAVAILABLE', { ctx })
    }
  }

  function findByKey(key, ctx) {
    return viaStore(() => store.list().find((record) => record.idempotencyKey === key), ctx)
  }

  return {
    findById(id, { ctx } = {}) {
      const record = viaStore(() => store.read(id), ctx)
      if (!record) throw domainError('NOT_FOUND', { ctx, message: 'there is no record ' + id, details: { id } })
      return record
    },

    insert(record, { ctx } = {}) {
      const key = record && typeof record.idempotencyKey === 'string' ? record.idempotencyKey : undefined
      if (key !== undefined) {
        const existing = findByKey(key, ctx)
        if (existing) return { created: false, record: existing }
      }
      const current = viaStore(() => store.read(record ? record.id : undefined), ctx)
      if (current) {
        throw domainError('CONFLICT', { ctx, message: 'record ' + record.id + ' already exists', details: { id: record.id } })
      }
      return { created: true, record: viaStore(() => store.write({ ...record, version: 1 }), ctx) }
    },

    update(id, patch, { ctx, expectedVersion } = {}) {
      const current = viaStore(() => store.read(id), ctx)
      if (!current) throw domainError('NOT_FOUND', { ctx, message: 'there is no record ' + id, details: { id } })
      if (expectedVersion !== undefined && current.version !== expectedVersion) {
        throw domainError('CONFLICT', {
          ctx,
          message: 'record ' + id + ' is at version ' + current.version,
          details: { id, expected: expectedVersion, actual: current.version },
        })
      }
      return viaStore(() => store.write({ ...current, ...patch, id, version: current.version + 1 }), ctx)
    },
  }
}
