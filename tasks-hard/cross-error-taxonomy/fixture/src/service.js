import { checkAuth } from './auth.js'
import { validateRequest } from './validate.js'
import { importCsv } from './importer.js'

/**
 * The use cases. The edge owns the HTTP; the service owns the work: who is
 * asking, whether the body is any good, and which module answers the question.
 */
export function createService({ repository, cache }) {
  return {
    createRecord(request, { ctx, now } = {}) {
      const body = validateRequest(request ? request.body : undefined, { ctx })
      checkAuth(request ? request.token : undefined, { ctx, now, requiredScope: 'records:write' })
      const written = repository.insert(body, { ctx })
      return { ok: true, created: written.created, record: written.record }
    },

    getRecord(id, request, { ctx, now } = {}) {
      checkAuth(request ? request.token : undefined, { ctx, now, requiredScope: 'records:read' })
      const result = cache.lookup(id, () => repository.findById(id, { ctx }), { ctx })
      return { ok: true, record: result.value, hit: result.hit }
    },

    importRecords(text, request, { ctx, now } = {}) {
      checkAuth(request ? request.token : undefined, { ctx, now, requiredScope: 'records:write' })
      const { rows } = importCsv(text, { ctx })
      const records = rows.map((row) => repository.insert({
        id: row.id,
        title: row.title,
        quantity: row.quantity,
        tags: row.tags,
      }, { ctx }).record)
      return { ok: true, imported: records.length, records }
    },
  }
}
