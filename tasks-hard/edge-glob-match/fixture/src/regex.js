/**
 * Turns a token into a regular-expression fragment.
 *
 * The fragments of a segment are concatenated by the pattern builder, which also
 * owns the separators between segments.
 */
import { TOKEN } from './segment.js'

/** Characters that mean something to a regular expression. */
const SPECIAL = /[.*+?^${}()|[\]\\/]/g

export function escapeLiteral(text) {
  return String(text).replace(SPECIAL, '\\$&')
}

export function tokenSource(token) {
  switch (token.kind) {
    case TOKEN.STAR:
      return '.*'
    case TOKEN.ONE:
      return '.'
    case TOKEN.CLASS:
      return '[' + token.body + ']'
    default:
      return escapeLiteral(token.value)
  }
}

export function tokensSource(tokens) {
  let source = ''
  for (const token of tokens) source += tokenSource(token)
  return source
}
