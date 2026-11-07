/**
 * errors - the payload the API returns for a failed call. The envelope is
 * `{ error: { code, message, details? } }`; the code and message are free
 * text, the details are entities and cross the boundary redacted.
 */
import { redact } from './redact.js'

export function toErrorPayload(err) {
  const error = { code: err.code, message: err.message }
  if (err.details !== undefined) error.details = redact(err.details)
  return { error }
}
