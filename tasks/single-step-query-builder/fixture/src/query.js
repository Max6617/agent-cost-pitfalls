/**
 * Query strings.
 *
 * The search API documents its parameters as `key=value` pairs joined by `&`,
 * with both sides percent-encoded. Two of its parameters are repeatable and must
 * appear once per value rather than once with a joined value.
 *
 * `URLSearchParams` is not used here: it encodes a space as `+`, and the search
 * API treats `+` as a literal plus sign, so a search for "a b" became a search
 * for "a+b".
 */

/** Percent-encode one component. */
export function encodeComponent(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, '+')
}

/**
 * Build a query string.
 *
 * @param {Record<string, unknown>} params
 * @returns {string} without a leading `?`
 */
export function buildQuery(params) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','))
      continue
    }
    if (value === true) {
      search.set(key, '')
      continue
    }
    if (value === false) continue
    search.set(key, String(value))
  }
  return search.toString().replace(/=$/, '').replace(/&$/, '')
}

/** Append a query string to a URL, replacing any it already had. */
export function withQuery(url, params) {
  const base = String(url).split('?')[0]
  const query = buildQuery(params)
  return query ? base + '?' + query : base
}

/** Read a query string back into an object, last value winning. */
export function parseQuery(query) {
  const out = {}
  const text = String(query ?? '').replace(/^\?/, '')
  if (!text) return out
  for (const pair of text.split('&')) {
    if (!pair) continue
    const eq = pair.indexOf('=')
    const key = decodeURIComponent(eq < 0 ? pair : pair.slice(0, eq))
    out[key] = eq < 0 ? true : decodeURIComponent(pair.slice(eq + 1))
  }
  return out
}
