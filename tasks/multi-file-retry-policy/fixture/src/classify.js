/**
 * Error classification.
 *
 * Upstream failures are not all the same. A rate limit will clear on its own
 * and must be waited out; a rejected payload never will and retrying it just
 * burns the batch quota. The worker decides what to do from this verdict alone.
 *
 * Codes arrive in two dialects — the HTTP status as a number, and the router's
 * symbolic name as a string (`RATE_LIMITED`, `per-host-limit`, ...) — and both
 * mean the same thing to us.
 */

/** Symbolic code -> HTTP status. */
const SYMBOLIC = {
  RATE_LIMITED: 429,
  PER_HOST_LIMIT: 429,
  TOO_MANY_REQUESTS: 429,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE: 422,
  SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
}

/** Statuses that will never succeed on a retry. */
const FATAL_STATUSES = new Set([400, 401, 403, 404, 409, 410, 422])

/** Statuses that will succeed if we wait long enough. */
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

/** Normalise either dialect to an HTTP status, or null when we do not know it. */
export function statusOf(error) {
  if (!error) return null
  if (typeof error.status === 'number') return error.status
  const code = String(error.code ?? '').trim()
  if (!code) return null
  if (/^\d{3}$/.test(code)) return Number(code)
  return SYMBOLIC[code.replace(/-/g, '_').toUpperCase()] ?? null
}

/**
 * What should the worker do with this failure?
 *
 * @param {unknown} error
 * @returns {{ kind: 'retry'|'fatal', status: number|null, reason: string }}
 */
export function classify(error) {
  const code = String(error?.code ?? '').trim()
  const normalised = code.replace(/-/g, '_').toUpperCase()

  if (normalised === 'BAD_REQUEST' || normalised === 'UNPROCESSABLE') {
    return { kind: 'fatal', status: SYMBOLIC[normalised] ?? null, reason: normalised.toLowerCase() }
  }

  const status = statusOf(error)
  if (status != null && FATAL_STATUSES.has(status)) {
    return { kind: 'fatal', status, reason: 'status-' + status }
  }

  return { kind: 'retry', status, reason: 'transient' }
}

/** Is this a rate limit we have to wait out rather than a plain server error? */
export function isRateLimited(error) {
  const status = statusOf(error)
  return status === 429 || status === 503
}
