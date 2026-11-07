/**
 * One pattern segment, split into tokens.
 *
 * A segment is the text between two separators, so nothing here has to think
 * about '/': a segment's tokens describe characters inside a single name.
 */

export const TOKEN = Object.freeze({
  LITERAL: 'literal',
  STAR: 'star',
  ONE: 'one',
  CLASS: 'class',
})

/**
 * Tokenize one segment.
 *
 * `\` makes the character after it literal, `*` and `?` are wildcards, and a
 * `[` that has a closing `]` after it opens a character class. A `[` that never
 * closes is just a bracket somebody typed.
 */
export function tokenize(segment) {
  const tokens = []
  let i = 0
  while (i < segment.length) {
    const ch = segment[i]
    if (ch === '\\' && i + 1 < segment.length) {
      tokens.push({ kind: TOKEN.LITERAL, value: segment[i + 1] })
      i += 2
      continue
    }
    if (ch === '*') {
      tokens.push({ kind: TOKEN.STAR })
      i += 1
      continue
    }
    if (ch === '?') {
      tokens.push({ kind: TOKEN.ONE })
      i += 1
      continue
    }
    if (ch === '[') {
      const close = segment.indexOf(']', i + 1)
      if (close !== -1) {
        tokens.push({ kind: TOKEN.CLASS, body: segment.slice(i + 1, close) })
        i = close + 1
        continue
      }
    }
    tokens.push({ kind: TOKEN.LITERAL, value: ch })
    i += 1
  }
  return tokens
}

/**
 * Whether the segment starts with a literal '.', which is how a pattern asks for
 * a hidden entry.
 */
export function startsWithLiteralDot(tokens) {
  const first = tokens[0]
  return first !== undefined && first.kind === TOKEN.LITERAL && first.value === '.'
}
