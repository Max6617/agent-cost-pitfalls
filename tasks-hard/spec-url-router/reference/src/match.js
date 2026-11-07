/**
 * Matching one parsed pattern against the segments of a request path.
 *
 * A pattern is a list of elements and a path is a list of segments; the two
 * line up from the left. Whatever a pattern element consumes is captured under
 * the name it declared, and the ranks of the elements that did the consuming
 * are collected as the match's specificity vector.
 */
import { decodeValue } from './decode.js'

const LITERAL = 3
const PARAMETER = 2
const WILDCARD = 1
const CATCH_ALL = 0

/**
 * Try a pattern against a path.
 *
 * Returns `{ params, vector }` when the pattern can consume the whole path, and
 * `null` when it cannot.
 */
export function matchPattern(pattern, segments, options = {}) {
  const caseSensitive = options.caseSensitive !== false
  return walk(pattern.segments, 0, segments, 0, { params: {}, vector: [] }, caseSensitive)
}

function walk(elements, at, segments, index, state, caseSensitive) {
  if (at === elements.length) return index === segments.length ? state : null

  const element = elements[at]

  if (element.kind === 'catchAll') {
    const values = []
    const vector = state.vector.slice()
    for (let i = index; i < segments.length; i += 1) {
      values.push(decodeValue(segments[i]))
      vector.push(CATCH_ALL)
    }
    const params = { ...state.params, [element.name]: values.join('/') }
    return walk(elements, at + 1, segments, segments.length, { params, vector }, caseSensitive)
  }

  if (element.kind === 'wildcard') {
    if (index >= segments.length) return null
    const params = { ...state.params, [element.name]: decodeValue(segments[index]) }
    const vector = [...state.vector, WILDCARD]
    return walk(elements, at + 1, segments, index + 1, { params, vector }, caseSensitive)
  }

  if (element.kind === 'param') {
    // Greedy from the left: take the segment when the rest of the pattern can
    // still be matched, and fall back to skipping the group when it cannot.
    if (index < segments.length) {
      const params = { ...state.params, [element.name]: decodeValue(segments[index]) }
      const vector = [...state.vector, PARAMETER]
      const taken = walk(elements, at + 1, segments, index + 1, { params, vector }, caseSensitive)
      if (taken !== null) return taken
    }
    if (element.optional) {
      return walk(elements, at + 1, segments, index, state, caseSensitive)
    }
    return null
  }

  if (index >= segments.length) return null
  if (!literalMatches(element.text, segments[index], caseSensitive)) return null
  return walk(elements, at + 1, segments, index + 1, { params: state.params, vector: [...state.vector, LITERAL] }, caseSensitive)
}

function literalMatches(text, segment, caseSensitive) {
  return caseSensitive ? text === segment : text.toLowerCase() === segment.toLowerCase()
}
