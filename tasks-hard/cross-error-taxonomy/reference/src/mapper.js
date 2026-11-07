import { CATALOGUE, catalogEntry } from './catalogue.js'
import { correlationOf } from './context.js'
import { isDomainError } from './errors.js'

/**
 * Turn a failure into the fields the HTTP edge needs: the status, the code, the
 * message the client may see, whether the client may try again, and the
 * correlation id that ties the response to the log line.
 *
 * The code and the message come from the catalogue; the internal message stays
 * in the log where it belongs.
 */
export function mapError(error, { ctx } = {}) {
  if (isDomainError(error)) {
    const entry = catalogEntry(error.code)
    const resolved = entry ?? CATALOGUE.INTERNAL
    const mapped = {
      code: entry ? error.code : 'INTERNAL',
      status: resolved.status,
      retryable: resolved.retryable && error.retryable !== false,
      message: resolved.message,
      correlationId: error.correlationId ?? correlationOf(ctx),
    }
    if (error.details !== undefined) mapped.details = error.details
    return mapped
  }

  return {
    code: 'INTERNAL',
    status: CATALOGUE.INTERNAL.status,
    retryable: false,
    message: CATALOGUE.INTERNAL.message,
    correlationId: correlationOf(ctx),
  }
}
