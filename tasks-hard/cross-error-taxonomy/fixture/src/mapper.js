import { isDomainError } from './errors.js'
import { correlationOf } from './context.js'

/**
 * Turn a failure into the fields the HTTP edge needs: the status, the code, the
 * message the client may see, whether the client may try again, and the
 * correlation id that ties the response to the log line.
 */
export function mapError(error, { ctx } = {}) {
  if (isDomainError(error)) {
    return {
      code: error.code,
      status: error.status,
      retryable: error.retryable,
      message: error.message,
      correlationId: error.correlationId || correlationOf(ctx),
    }
  }
  return {
    code: null,
    status: 500,
    retryable: false,
    message: 'Internal Server Error',
    correlationId: correlationOf(ctx),
  }
}
