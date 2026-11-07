/**
 * Builds the regular-expression source for a whole pattern.
 *
 * Segments are matched left to right and joined by a literal separator. A
 * whole-segment '**' is the "any number of directories" wildcard: it consumes
 * whole segments, each of them with the separator in front of it, so that a
 * double star which consumes nothing disappears together with its '/'.
 */
import { tokenize, startsWithLiteralDot } from './segment.js'
import { tokensSource } from './regex.js'
import { splitPattern } from './paths.js'

/**
 * The text a pattern has to match, plus whether it asked for a directory.
 * 'backup/' -> { body: 'backup', dirOnly: true }
 */
function splitDirectoryMarker(pattern) {
  const dirOnly = pattern.length > 1 && pattern.endsWith('/')
  return { body: dirOnly ? pattern.slice(0, -1) : pattern, dirOnly }
}

function toPlan(text) {
  return text === '**' ? { globstar: true } : { tokens: tokenize(text) }
}

/**
 * The guard that keeps a wildcard out of a hidden segment. A segment that starts
 * with a literal dot asks for one, so it needs no guard.
 */
function segmentGuard(options, tokens) {
  if (options.dot) return ''
  if (tokens !== undefined && startsWithLiteralDot(tokens)) return ''
  return '(?!\\.)'
}

function compose(plans, options) {
  let source = ''
  let separatorEaten = false
  for (let i = 0; i < plans.length; i += 1) {
    const plan = plans[i]
    if (plan.globstar) {
      if (i === 0) {
        // A leading '**/' owns the separators of the segments it eats, so it may
        // also eat none of them: '**/x' matches 'x'.
        source += '(?:' + segmentGuard(options, undefined) + '[^/]*\\/)*'
        separatorEaten = true
        if (i === plans.length - 1) source += segmentGuard(options, undefined) + '[^/]*'
      } else {
        // Anywhere else the double star owns the separators in front of the
        // segments it eats and leaves the one behind it to the next segment.
        source += '(?:\\/' + segmentGuard(options, undefined) + '[^/]*)*'
        separatorEaten = false
      }
      continue
    }
    if (i > 0 && !separatorEaten) source += '\\/'
    separatorEaten = false
    source += segmentGuard(options, plan.tokens) + tokensSource(plan.tokens)
  }
  return source
}

/**
 * @returns {{source: string, dirOnly: boolean, prefixSource: string|null}}
 *   `source` is anchored and is matched against a path whose directory marker
 *   has already been removed. `prefixSource`, when present, is what the path
 *   would have to look like for the trailing '**' to have eaten nothing: the
 *   '/' in 'dir/**' still has to be matched, so a plain file 'dir' is not a
 *   match even though the double star may match no segment at all.
 */
export function buildPattern(pattern, options) {
  const { body, dirOnly } = splitDirectoryMarker(pattern)
  const plans = splitPattern(body).map(toPlan)
  const prefix = plans.length > 1 && plans[plans.length - 1].globstar
    ? '^' + compose(plans.slice(0, -1), options) + '$'
    : null
  return { source: '^' + compose(plans, options) + '$', dirOnly, prefixSource: prefix }
}
