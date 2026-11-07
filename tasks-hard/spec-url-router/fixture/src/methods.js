/**
 * Request methods.
 *
 * Routes are filed per method, and the tables that get consulted for a request
 * are decided here so the router itself stays a lookup.
 */

export const KNOWN_METHODS = Object.freeze([
  'GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS',
])

/** Methods are compared upper-cased; anything else is left as it arrived. */
export function normaliseMethod(method) {
  return typeof method === 'string' ? method.trim().toUpperCase() : ''
}

/**
 * The method tables consulted for a request, in order.
 *
 * The router walks the tables it returns and takes every route in them as a
 * candidate.
 */
export function candidateMethods(method) {
  return typeof method === 'string' && method.length ? [method] : []
}
