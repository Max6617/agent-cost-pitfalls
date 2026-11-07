/**
 * Small text helpers shared by the pattern parser and the request reader.
 */

/** Names a pattern may capture under. */
export const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

export function isIdentifier(text) {
  return typeof text === 'string' && IDENTIFIER.test(text)
}

export function isBlank(text) {
  return typeof text !== 'string' || text.trim() === ''
}

/** The last character of a string, or '' when there is none. */
export function lastChar(text) {
  return typeof text === 'string' && text.length ? text[text.length - 1] : ''
}

/** Split on a separator and drop the empty strings around it. */
export function splitClean(text, separator) {
  return String(text).split(separator).filter((part) => part !== '')
}
