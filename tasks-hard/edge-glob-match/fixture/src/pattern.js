/**
 * Builds the regular-expression source for a whole pattern.
 *
 * Segments are matched left to right and joined by a literal separator. A
 * whole-segment '**' is the "any number of directories" wildcard.
 */
import { tokenize, startsWithLiteralDot } from './segment.js'
import { tokensSource } from './regex.js'
import { splitPattern } from './paths.js'

/**
 * @returns {{ source: string }} an anchored regular expression source, matched
 *   against a path whose directory marker has already been removed.
 */
export function buildPattern(pattern, options) {
  const segments = splitPattern(pattern)
  let source = ''

  for (let i = 0; i < segments.length; i += 1) {
    const text = segments[i]
    if (i > 0) source += '\\/'
    if (text === '**') {
      // A double star may match nothing at all, which is what makes a pattern
      // like 'src/**' cover the directory as well as its contents.
      source += '[^/]*'
      continue
    }
    source += tokensSource(tokenize(text))
  }

  // A wildcard must not pick up a dot entry unless the pattern asks for one by
  // starting with a literal dot.
  const escapesDot = !options.dot && !startsWithLiteralDot(tokenize(segments[0]))
  return { source: '^' + (escapesDot ? '(?!\\.)' : '') + source + '$' }
}
