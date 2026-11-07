import { checkAuth } from './auth.js'
import { validateRequest } from './validate.js'
import { importCsv } from './importer.js'
import { isDomainError, wrap } from './errors.js'

/**
 * The use cases. The edge owns the HTTP; the service owns the work: who is
 * asking, whether the body is any good, and which module answers the question.
 *
 * Auth comes first, before the body is looked at: who is asking is not
 * something the body gets a vote on.
 */
export function createService({ repository, cache }) {
  return {
    createRecord(request, { ctx, now } = {}) {
      checkAuth(request ? request.token : undefined, { ctx, now, requiredScope: 'records:write' })
      const body = validateRequest(request ? request.body : undefined, { ctx })

      let written
      try {
        written = repository.insert(body, { ctx })
      } catch (cause) {
        // A write that is not repeatable and failed for a retryable reason may
        // already have been applied. The client is told the write did not land;
        // what happened underneath stays in the cause for the log.
        if (isDomainError(cause) && cause.retryable === true && body.idempotencyKey === undefined) {
          throw wrap(cause, 'WRITE_NOT_APPLIED', { ctx, details: { id: body.id } })
        }
        throw cause
      }

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
