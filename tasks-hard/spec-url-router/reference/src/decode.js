/**
 * Percent-decoding for captured values and query strings.
 *
 * Decoding runs on values that have already been matched, never on the text a
 * match was decided from, so a `%2F` stays inside the segment it was written
 * in. Text that carries a `%` which is not a valid escape is refused: the
 * router would rather report the request than route half of it.
 */
import { MalformedEscapeError } from './errors.js'

const PLUS = /\+/g
const BAD_ESCAPE = /%(?![0-9A-Fa-f]{2})/

/** The first `%` in `text` that is not followed by two hex digits, or null. */
function badEscape(text) {
  const found = BAD_ESCAPE.exec(text)
  return found === null ? null : text.slice(found.index, found.index + 3)
}

/**
 * Decode one run of text, exactly once.
 *
 * `plus` says whether `+` arrived as a space (query strings) or as a plus sign
 * (path segments).
 */
function decodeStrict(text, plus = false) {
  const source = plus ? text.replace(PLUS, ' ') : text
  if (!source.includes('%')) return source

  const bad = badEscape(source)
  if (bad !== null) throw new MalformedEscapeError(`malformed percent escape: ${bad}`, bad)

  try {
    return decodeURIComponent(source)
  } catch {
    throw new MalformedEscapeError(`percent escapes in ${JSON.stringify(source)} are not valid UTF-8`, source)
  }
}

/**
 * Decode a whole run of path text without complaining about it.
 *
 * Kept for callers that want to show a target back to a human; routing does not
 * use it, because a target that does not decode is not routed quietly.
 */
export function decodeLoose(text) {
  if (typeof text !== 'string' || !text.includes('%')) return text
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

/** Decode one captured value from a path. `+` is an ordinary plus here. */
export function decodeValue(text) {
  return decodeStrict(String(text), false)
}

/**
 * Refuse a run of path text that carries a malformed escape.
 *
 * Matching reads the raw path, so a segment nothing captures would otherwise
 * never be looked at; the router checks every segment up front instead.
 */
export function assertDecodable(text) {
  decodeStrict(String(text), false)
  return text
}

/**
 * Read a query string into a plain object.
 *
 * Keys and values are both decoded, a key with no `=` is present with the empty
 * string, and a key that appears more than once keeps every value in order.
 */
export function parseQuery(queryString) {
  const query = {}
  if (typeof queryString !== 'string' || queryString === '') return query

  for (const pair of queryString.split('&')) {
    if (pair === '') continue
    const eq = pair.indexOf('=')
    const key = decodeStrict(eq === -1 ? pair : pair.slice(0, eq), true)
    const value = decodeStrict(eq === -1 ? '' : pair.slice(eq + 1), true)

    const seen = query[key]
    if (seen === undefined) query[key] = value
    else if (Array.isArray(seen)) seen.push(value)
    else query[key] = [seen, value]
  }

  return query
}
