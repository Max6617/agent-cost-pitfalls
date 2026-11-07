/**
 * Path text helpers.
 *
 * The selector never touches the filesystem: a path is a string, and the only
 * piece of filesystem-like information it carries is a trailing '/', which says
 * that the entry is a directory.
 */
import { classEnd } from './segment.js'

/** True when the path carries the directory marker (a trailing '/'). */
export function isDirectory(path) {
  if (typeof path !== 'string') return false
  return path.length > 1 && path.endsWith('/')
}

/** The path without its directory marker: 'src/lib/' -> 'src/lib'. */
export function stripDirectoryMarker(path) {
  return isDirectory(path) ? path.slice(0, -1) : path
}

/** The segments of a path, in order. 'src/lib/' -> ['src', 'lib']. */
export function splitPath(path) {
  const body = stripDirectoryMarker(path)
  return body === '' ? [] : body.split('/')
}

/**
 * The segments of a pattern, in order.
 *
 * '/' separates segments, except inside a character class: a class is one
 * pattern segment, so `data[0/1].json` is a single segment and its '/' is a
 * member the class can never match. Splitting and tokenizing have to agree about
 * where a class starts and ends, so both use the same scanner. Every other '/'
 * separates, escaped or not.
 */
export function splitPattern(pattern) {
  const segments = []
  let current = ''
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '[') {
      const end = classEnd(pattern, i)
      if (end !== -1) {
        current += pattern.slice(i, end + 1)
        i = end + 1
        continue
      }
    }
    if (ch === '/') {
      segments.push(current)
      current = ''
      i += 1
      continue
    }
    current += ch
    i += 1
  }
  segments.push(current)
  return segments
}
