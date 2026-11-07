/**
 * Patterns.
 *
 * A pattern is written the way the path it serves is written, with the segment
 * that varies marked up: `:id` for a value, `*name` and `**name` for the
 * segments the route is happy to leave loose, `{id}` when the segment may not
 * be there at all.
 */

/** The segment kinds a pattern can be made of. */
export const PATTERN_KINDS = Object.freeze(['literal', 'param', 'wildcard', 'catchAll'])

/**
 * Read a pattern into the elements the matcher walks.
 *
 * The text of the pattern as written is kept on `pattern` so a route can report
 * itself back the way it was declared.
 */
export function parsePattern(pattern) {
  const text = String(pattern ?? '')
  const segments = text.split('/').slice(1).map(readSegment)
  return { pattern: text, segments }
}

function readSegment(text) {
  if (text.startsWith(':')) return { kind: 'param', name: text.slice(1), text }
  if (text.startsWith('**')) return { kind: 'catchAll', name: text.slice(2), text }
  if (text.startsWith('*')) return { kind: 'wildcard', name: text.slice(1), text }
  if (text.startsWith('{') && text.endsWith('}')) {
    return { kind: 'param', name: text.slice(1, -1), optional: true, text }
  }
  return { kind: 'literal', text }
}
