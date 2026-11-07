/**
 * One pattern segment, split into tokens.
 *
 * A segment is the text between two separators, so nothing here has to think
 * about '/': a segment's tokens describe characters inside a single name.
 *
 * A class token carries the regular-expression source it is worth, because
 * parsing a class is the same job as finding where it ends.
 */

export const TOKEN = Object.freeze({
  LITERAL: 'literal',
  STAR: 'star',
  ONE: 'one',
  CLASS: 'class',
})

/**
 * Index of the ']' that closes the class opened at `start`, or -1 when the '['
 * never closes and is therefore an ordinary bracket.
 */
export function classEnd(text, start) {
  let i = start + 1
  if (text[i] === '!' || text[i] === '^') i += 1
  // A ']' in the first position is a member, not the end of the class.
  if (text[i] === ']') i += 1
  while (i < text.length) {
    if (text[i] === '\\') {
      i += 2
      continue
    }
    if (text[i] === ']') return i
    i += 1
  }
  return -1
}

function escapeMember(ch) {
  return ch.replace(/[\\\]\[\^-]/g, '\\$&')
}

/**
 * The regular expression a class body stands for: one character out of a set.
 * `!` and `^` negate, `]` may be a member, `a-z` is a range, `-` at either edge
 * is an ordinary member, and a '/' is ignored because a class never matches a
 * separator.
 */
function classSource(body) {
  let text = body
  let negated = false
  if (text.startsWith('!') || text.startsWith('^')) {
    negated = true
    text = text.slice(1)
  }

  const parts = []
  let i = 0
  while (i < text.length) {
    let ch = text[i]
    let escaped = false
    if (ch === '\\' && i + 1 < text.length) {
      ch = text[i + 1]
      escaped = true
      i += 1
    }
    i += 1
    if (ch === '/') continue

    const isRange = !escaped && ch !== '-' && text[i] === '-' && i + 1 < text.length
    if (isRange) {
      let to = text[i + 1]
      let toEscaped = false
      if (to === '\\' && i + 2 < text.length) {
        to = text[i + 2]
        toEscaped = true
      }
      parts.push(escapeMember(ch) + '-' + escapeMember(to))
      i += toEscaped ? 3 : 2
      continue
    }
    parts.push(escapeMember(ch))
  }

  if (parts.length === 0) return negated ? '[^/]' : '[]'
  return '[' + (negated ? '^' : '') + parts.join('') + ']'
}

/**
 * Tokenize one segment.
 *
 * `\` makes the character after it literal - including a trailing `\`, which
 * stands for itself - `*` and `?` are wildcards, and a `[` that has a closing
 * `]` after it opens a character class. A `[` that never closes is just a
 * bracket somebody typed.
 */
export function tokenize(segment) {
  const tokens = []
  let i = 0
  while (i < segment.length) {
    const ch = segment[i]
    if (ch === '\\') {
      const hasNext = i + 1 < segment.length
      tokens.push({ kind: TOKEN.LITERAL, value: hasNext ? segment[i + 1] : '\\' })
      i += hasNext ? 2 : 1
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
      const end = classEnd(segment, i)
      if (end !== -1) {
        tokens.push({ kind: TOKEN.CLASS, source: classSource(segment.slice(i + 1, end)) })
        i = end + 1
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
