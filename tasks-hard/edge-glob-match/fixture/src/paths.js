/**
 * Path text helpers.
 *
 * The selector never touches the filesystem: a path is a string, and the only
 * piece of filesystem-like information it carries is a trailing '/', which says
 * that the entry is a directory.
 */

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
 * Patterns are written with '/' on every platform, but jobs are edited by hand
 * and a Windows-flavoured separator turns up often enough that the tool accepts
 * one instead of reporting a pattern that silently matches nothing.
 */
export function normalizeSeparators(pattern) {
  return pattern.replace(/\\/g, '/')
}

/**
 * The segments of a pattern, in order. A pattern is text, so this is a split on
 * the separator and nothing more.
 */
export function splitPattern(pattern) {
  return pattern.split('/')
}
