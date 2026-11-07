import { correlationOf } from './context.js'
import { mapError } from './mapper.js'

const JSON_HEADERS = { 'content-type': 'application/json' }

function headersFor(correlationId) {
  const headers = { ...JSON_HEADERS }
  if (correlationId !== null && correlationId !== undefined) headers['x-correlation-id'] = correlationId
  return headers
}

/** The JSON response the edge sends back for a use case that returned. */
export function buildSuccess(value, { ctx } = {}) {
  return {
    status: 200,
    headers: headersFor(correlationOf(ctx)),
    body: { data: value },
  }
}

/** The JSON response the edge sends back for a use case that threw. */
export function buildErrorResponse(error, { ctx } = {}) {
  const mapped = mapError(error, { ctx })
  const failure = {
    code: mapped.code,
    message: mapped.message,
    retryable: mapped.retryable,
    correlationId: mapped.correlationId,
  }
  if (mapped.details !== undefined) failure.details = mapped.details

  return {
    status: mapped.status,
    headers: headersFor(mapped.correlationId),
    body: { error: failure },
  }
}
