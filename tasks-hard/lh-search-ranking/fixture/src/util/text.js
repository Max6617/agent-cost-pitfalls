/** Small helpers shared by the index and the CLI. */

/**
 * Compare two ids the way the ordering rules do: character by character, on
 * the code units, so the answer does not depend on the machine's locale.
 */
export function compareIds(left, right) {
  if (left === right) return 0
  return left < right ? -1 : 1
}

/** Shorten a string for terminal output. */
export function truncate(text, width) {
  const value = String(text ?? '')
  if (value.length <= width) return value
  return value.slice(0, Math.max(0, width - 3)) + '...'
}

/** `1 document`, `3 documents`. */
export function pluralise(count, singular, plural) {
  if (count === 1) return singular
  return plural === undefined ? singular + 's' : plural
}
