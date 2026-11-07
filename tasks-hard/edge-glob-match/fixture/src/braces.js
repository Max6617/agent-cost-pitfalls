/**
 * Brace alternation: `{a,b}` writes several patterns in one.
 *
 * Expansion is textual and happens before anything else looks at the pattern,
 * so an alternative may contain '/' and a group may span segments.
 */

/**
 * Expand every brace group in `pattern`.
 *
 * @returns {string[]} one entry per alternative, in the order the alternatives
 *   are written, without duplicates removed.
 */
export function expandBraces(pattern) {
  if (typeof pattern !== 'string') throw new TypeError('pattern must be a string')
  const out = []
  expandInto(pattern, out)
  return out
}

function expandInto(text, out) {
  const group = findGroup(text)
  if (group === null) {
    out.push(text)
    return
  }
  const body = text.slice(group.open + 1, group.close)
  for (const alternative of body.split(',')) {
    expandInto(text.slice(0, group.open) + alternative + text.slice(group.close + 1), out)
  }
}

/**
 * The first brace group in the text: from the first '{' to the first '}' after
 * it. If either is missing the text has no group.
 */
function findGroup(text) {
  const open = text.indexOf('{')
  if (open === -1) return null
  const close = text.indexOf('}', open + 1)
  if (close === -1) return null
  return { open, close }
}
