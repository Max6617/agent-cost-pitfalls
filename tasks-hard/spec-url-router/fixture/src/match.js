/**
 * Matching one parsed pattern against the segments of a request path.
 *
 * A pattern is a list of elements and a path is a list of segments; the two
 * line up from the left. Whatever a pattern element consumes is captured under
 * the name it declared.
 */
import { decodeValue } from './decode.js'

/**
 * Try a pattern against a path.
 *
 * Returns `{ params }` when the pattern can consume the whole path, and `null`
 * when it cannot.
 */
export function matchPattern(pattern, segments) {
  const params = {}
  let index = 0

  for (const element of pattern.segments) {
    if (element.kind === 'catchAll') {
      if (index >= segments.length) return null
      params[element.name] = takeRest(segments, index).join('/')
      index = segments.length
      continue
    }

    if (element.kind === 'wildcard') {
      if (index >= segments.length) return null
      params[element.name] = takeRest(segments, index).join('/')
      index = segments.length
      continue
    }

    if (element.kind === 'param') {
      if (index >= segments.length) {
        if (element.optional) continue
        return null
      }
      params[element.name] = decodeValue(segments[index])
      index += 1
      continue
    }

    if (index >= segments.length) return null
    if (element.text !== segments[index]) return null
    index += 1
  }

  if (index !== segments.length) return null
  return { params }
}

function takeRest(segments, from) {
  const values = []
  for (let i = from; i < segments.length; i += 1) values.push(decodeValue(segments[i]))
  return values
}
