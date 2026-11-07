import { mapError } from './mapper.js'

/** The JSON response the edge sends back for a use case that returned. */
export function buildSuccess(value, { ctx } = {}) {
  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: { data: value },
  }
}

/** The JSON response the edge sends back for a use case that threw. */
export function buildErrorResponse(error, { ctx } = {}) {
  return {
    status: 500,
    headers: { 'content-type': 'application/json' },
    body: { error: { message: 'Internal Server Error' } },
  }
}

export { mapError }
