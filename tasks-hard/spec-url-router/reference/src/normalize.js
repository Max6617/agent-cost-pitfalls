/**
 * Reading a request target.
 *
 * A target is whatever the request line carried: a path, maybe a query string,
 * maybe a fragment. The router only routes the path, so everything else is
 * peeled off here and passed along separately.
 */
import { assertDecodable } from './decode.js'

/**
 * Split a target into the part that is routed and the query string.
 *
 * The fragment comes off first: it is not part of the request as far as the
 * framework is concerned, so a `?` inside it does not start a query string.
 */
export function splitTarget(target) {
  const text = typeof target === 'string' ? target : ''
  const hash = text.indexOf('#')
  const withoutFragment = hash === -1 ? text : text.slice(0, hash)
  const mark = withoutFragment.indexOf('?')
  const path = mark === -1 ? withoutFragment : withoutFragment.slice(0, mark)
  const queryString = mark === -1 ? '' : withoutFragment.slice(mark + 1)
  return { path, queryString }
}

/**
 * Fold a path into the shape the route table is written in.
 *
 * Both sides of a match go through here, so a pattern and a request that only
 * differ in punctuation end up as the same string: the path is rooted, runs of
 * slashes collapse to one, and a trailing slash is dropped.
 */
export function normalizePath(path) {
  let text = String(path ?? '')
  if (!text.startsWith('/')) text = `/${text}`
  text = text.replace(/\/{2,}/g, '/')
  if (text.length > 1) text = text.replace(/\/+$/, '')
  return text === '' ? '/' : text
}

/** The routed path, the query string, and the segments of the routed path. */
export function readTarget(target) {
  const { path, queryString } = splitTarget(target)
  const normalized = normalizePath(path)
  const segments = splitPath(normalized)

  // A target the router cannot read is refused before anything is matched
  // against it, whether or not a route would have wanted the segment.
  for (const segment of segments) assertDecodable(segment)

  return { path: normalized, queryString, segments }
}

/**
 * Split a normalised path into its segments.
 *
 * The leading `/` is not a segment, and neither is anything a run of slashes
 * left behind: by this point there is nothing empty to split off.
 */
export function splitPath(path) {
  const text = normalizePath(path)
  return text === '/' ? [] : text.slice(1).split('/')
}
