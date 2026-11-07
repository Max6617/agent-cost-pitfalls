/**
 * Reading a request target.
 *
 * A target is whatever the request line carried: a path, maybe a query string,
 * maybe a fragment. The router only routes the path, so everything else is
 * peeled off here and passed along separately.
 */
import { decodeLoose } from './decode.js'

/**
 * Split a target into the part that is routed and the query string.
 *
 * The fragment is not part of the request as far as the framework is
 * concerned, and it never reaches the route table.
 */
export function splitTarget(target) {
  const text = typeof target === 'string' ? target : ''
  const mark = text.indexOf('?')
  const queryString = mark === -1 ? '' : text.slice(mark + 1)
  const path = (mark === -1 ? text : text.slice(0, mark)).split('#')[0]
  return { path, queryString }
}

/**
 * Fold a path into the shape the route table is written in.
 *
 * Both sides of a match go through here, so a pattern and a request that only
 * differ in punctuation end up as the same string.
 */
export function normalizePath(path) {
  return String(path ?? '')
}

/** The routed path and the query string of a request target. */
export function readTarget(target) {
  const { path, queryString } = splitTarget(target)
  return { path: decodeLoose(path), queryString }
}

/**
 * Split a normalised path into its segments.
 *
 * Returns null for text that is not a rooted path at all: a routed path always
 * begins at `/`.
 */
export function splitPath(path) {
  const text = String(path ?? '')
  if (!text.startsWith('/')) return null
  return text.split('/').slice(1)
}
