/**
 * Request sanitisation.
 *
 * The ingress turns whatever the transport handed us into the shape the router
 * and the modules are allowed to see: lowercase header names, a body that is
 * never `undefined`, and a path with no query string. The trace context is added
 * separately, by the ingress, so that a caller-supplied header can never be
 * mistaken for one.
 */
const REQUEST_ID_HEADERS = ['x-request-id', 'x-trace-id', 'traceparent', 'x-b3-traceid']

export function sanitizeRequest(raw = {}) {
  const headers = {}
  for (const [key, value] of Object.entries(raw.headers ?? {})) {
    if (value === undefined || value === null) continue
    headers[String(key).toLowerCase()] = String(value)
  }
  const path = String(raw.path ?? '/').split('?')[0].replace(/\/+$/, '') || '/'
  return {
    method: String(raw.method ?? 'GET').toUpperCase(),
    path,
    headers,
    body: raw.body ?? {},
  }
}

/**
 * Whatever identifier the caller claimed for itself. It is metadata about the
 * connection, not a trace context: the service mints its own trace ids.
 */
export function callerRequestId(headers = {}) {
  for (const name of REQUEST_ID_HEADERS) {
    const value = headers[name]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return undefined
}
