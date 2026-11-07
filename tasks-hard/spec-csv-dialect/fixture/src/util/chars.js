/**
 * Small text helpers that are not about CSV at all.
 */

/** The only whitespace the dialect trims is a space and a tab. */
export function isSpaceOrTab(ch) {
  return ch === ' ' || ch === '\t'
}

export function trimEdges(text) {
  let start = 0
  let end = text.length
  while (start < end && isSpaceOrTab(text[start])) start += 1
  while (end > start && isSpaceOrTab(text[end - 1])) end -= 1
  return text.slice(start, end)
}

/** Cut a sample down to its first line, CRLF included. */
export function firstLine(text) {
  const at = text.indexOf('\n')
  if (at < 0) return text
  return at > 0 && text[at - 1] === '\r' ? text.slice(0, at - 1) : text.slice(0, at)
}

/** A short rendering of a value for a report line. */
export function describe(value) {
  if (value === null) return 'absent'
  if (value === undefined) return 'missing'
  if (value === '') return 'empty'
  const text = String(value)
  return text.length > 40 ? text.slice(0, 37) + '...' : text
}
