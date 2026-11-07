/**
 * errors - the payload the API returns for a failed call. The envelope is
 * `{ error: { code, message, details? } }`; details carries whatever the
 * caller rejected, keyed by what it is.
 */
export function toErrorPayload(err) {
  const error = { code: err.code, message: err.message }
  if (err.details !== undefined) error.details = err.details
  return { error }
}
