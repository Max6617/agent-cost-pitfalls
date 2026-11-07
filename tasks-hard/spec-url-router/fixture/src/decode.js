/**
 * Percent-decoding for captured values and query strings.
 *
 * The framework hands the router whatever arrived on the socket, so decoding
 * has to cope with text that was never encoded in the first place. Values that
 * do not decode are handed back the way they came in.
 */
const PLUS = /\+/g

/**
 * Decode a whole run of path text.
 *
 * Used while a request target is being read, before the path is split up.
 */
export function decodeLoose(text) {
  if (typeof text !== 'string' || !text.includes('%')) return text
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

/** Decode one captured value. Query rules apply: `+` arrived as a space. */
export function decodeValue(text) {
  if (typeof text !== 'string') return text
  try {
    return decodeURIComponent(text.replace(PLUS, ' '))
  } catch {
    return text
  }
}

/**
 * Read a query string into a plain object.
 *
 * `?page=2` is `{ page: '2' }`; a key with no `=` at all is present with the
 * empty string.
 */
export function parseQuery(queryString) {
  const query = {}
  if (typeof queryString !== 'string' || queryString === '') return query
  for (const pair of queryString.split('&')) {
    if (pair === '') continue
    const eq = pair.indexOf('=')
    const key = eq === -1 ? pair : pair.slice(0, eq)
    const value = eq === -1 ? '' : pair.slice(eq + 1)
    query[key] = decodeURIComponent(value)
  }
  return query
}
