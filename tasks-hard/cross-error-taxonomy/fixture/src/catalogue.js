/**
 * The closed catalogue of codes this service may report.
 *
 * `status` and `retryable` describe the condition, not the caller: a module that
 * raises a code does not get to choose either of them. See docs/error-policy.md.
 *
 * `message` is the client-safe message. It is the only text a client ever sees
 * for a code, whatever the internal message of the failure was.
 */
export const CATALOGUE = Object.freeze({
  VALIDATION_FAILED: Object.freeze({ status: 400, retryable: false, message: 'The request could not be accepted.' }),
  UNAUTHENTICATED: Object.freeze({ status: 401, retryable: false, message: 'Sign in to continue.' }),
  FORBIDDEN: Object.freeze({ status: 403, retryable: false, message: 'You do not have access to this resource.' }),
  NOT_FOUND: Object.freeze({ status: 404, retryable: false, message: 'The requested record does not exist.' }),
  CONFLICT: Object.freeze({ status: 409, retryable: false, message: 'The record changed since you read it.' }),
  DUPLICATE_JOB: Object.freeze({ status: 409, retryable: false, message: 'That job has already been accepted.' }),
  ROW_INVALID: Object.freeze({ status: 422, retryable: false, message: 'The file contains a row that could not be imported.' }),
  RATE_LIMITED: Object.freeze({ status: 429, retryable: true, message: 'Too many requests. Try again shortly.' }),
  INTERNAL: Object.freeze({ status: 500, retryable: false, message: 'Something went wrong on our side.' }),
  JOB_FAILED: Object.freeze({ status: 500, retryable: false, message: 'The job did not complete.' }),
  WRITE_NOT_APPLIED: Object.freeze({ status: 500, retryable: false, message: 'The write was not applied.' }),
  UPSTREAM_REJECTED: Object.freeze({ status: 502, retryable: false, message: 'An upstream service refused the request.' }),
  UPSTREAM_UNAVAILABLE: Object.freeze({ status: 502, retryable: true, message: 'An upstream service is unavailable.' }),
  DEPENDENCY_UNAVAILABLE: Object.freeze({ status: 503, retryable: true, message: 'A supporting service is unavailable.' }),
  UPSTREAM_TIMEOUT: Object.freeze({ status: 504, retryable: true, message: 'An upstream service did not answer in time.' }),
})

/** Every code, sorted, so nothing has to keep its own list in step. */
export const CODES = Object.freeze(Object.keys(CATALOGUE).sort())

/** The catalogue entry for a code, or `undefined` when the code is not ours. */
export function catalogEntry(code) {
  return Object.prototype.hasOwnProperty.call(CATALOGUE, code) ? CATALOGUE[code] : undefined
}
