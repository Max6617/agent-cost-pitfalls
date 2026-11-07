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
 * A HEAD request is served by the GET table as well, and the HEAD table comes
 * first: when the two tie on specificity the HEAD route is the one declared
 * "earlier" as far as the router is concerned.
 */
export function candidateMethods(method) {
  const upper = normaliseMethod(method)
  if (upper === '') return []
  if (upper === 'HEAD') return ['HEAD', 'GET']
  return [upper]
}
