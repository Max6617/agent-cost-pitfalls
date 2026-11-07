/**
 * Patterns.
 *
 * A pattern is written the way the path it serves is written, with the segment
 * that varies marked up: `:id` for a value, `*name` and `**name` for the
 * segments the route is happy to leave loose, `{id}` when the segment may not
 * be there at all. A backslash makes the character after it ordinary text.
 */
import { RouteError } from './errors.js'
import { isIdentifier } from './util/text.js'
import { normalizePath } from './normalize.js'

/** The segment kinds a pattern can be made of. */
export const PATTERN_KINDS = Object.freeze(['literal', 'param', 'wildcard', 'catchAll'])

/** Characters a backslash is allowed to take the meaning away from. */
const ESCAPABLE = new Set([':', '*', '{', '}', '?', '#', '\\'])

/**
 * Read a pattern into the elements the matcher walks.
 *
 * The text of the pattern as written is kept on `pattern` so a route can report
 * itself back the way it was declared; matching uses the normalised form, the
 * same one a request path is folded into.
 */
export function parsePattern(pattern) {
  const text = String(pattern ?? '')
  const normalised = normalizePath(text)
  const raw = normalised === '/' ? [] : normalised.slice(1).split('/')

  const segments = raw.map((segment) => readSegment(segment, text))
  const names = new Set()

  segments.forEach((element, index) => {
    if (element.kind === 'catchAll' && index !== segments.length - 1) {
      throw new RouteError('a catch-all can only be the last segment of a pattern', text)
    }
    if (!element.name) return
    if (names.has(element.name)) {
      throw new RouteError(`the name "${element.name}" is declared twice in one pattern`, text)
    }
    names.add(element.name)
  })

  return { pattern: text, segments, names: [...names] }
}

function readSegment(raw, pattern) {
  const head = raw[0]
  const escaped = head === '\\'

  if (!escaped && head === ':') return parameter(raw.slice(1), raw, pattern)
  if (!escaped && head === '*') {
    return raw.startsWith('**')
      ? { kind: 'catchAll', name: name(raw.slice(2), raw, pattern), text: raw }
      : { kind: 'wildcard', name: name(raw.slice(1), raw, pattern), text: raw }
  }
  if (!escaped && head === '{' && raw.endsWith('}')) {
    return { kind: 'param', name: name(raw.slice(1, -1), raw, pattern), optional: true, text: raw }
  }
  return { kind: 'literal', text: unescape(raw, pattern) }
}

function name(text, raw, pattern) {
  if (!isIdentifier(text)) throw new RouteError(`"${raw}" does not declare a name`, pattern)
  return text
}

function parameter(text, raw, pattern) {
  return { kind: 'param', name: name(text, raw, pattern), text: raw }
}

/**
 * The literal text of a segment: everything a backslash escaped, verbatim.
 *
 * A `?` or a `#` that was not escaped is refused here — a pattern is a path,
 * and a request target's query and fragment are not part of one.
 */
function unescape(raw, pattern) {
  let text = ''
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i]
    if (char === '?') throw new RouteError('an unescaped "?" cannot appear in a pattern', pattern)
    if (char === '#') throw new RouteError('an unescaped "#" cannot appear in a pattern', pattern)
    if (char !== '\\') {
      text += char
      continue
    }
    const next = raw[i + 1]
    if (next === undefined) throw new RouteError('a pattern cannot end with a backslash', pattern)
    if (!ESCAPABLE.has(next)) throw new RouteError(`"\\${next}" is not an escape`, pattern)
    text += next
    i += 1
  }
  return text
}
