/**
 * compile — the front door of the selector.
 *
 * A pattern is normalised, expanded, turned into one regular-expression source
 * per brace alternative, and handed to a Matcher. Sources are cached: the backup
 * tool compiles the same handful of patterns for every job it runs.
 */
import { normalizeOptions, optionKey } from './options.js'
import { normalizeSeparators } from './paths.js'
import { expandBraces } from './braces.js'
import { buildPattern } from './pattern.js'
import { Matcher } from './matcher.js'

const sourceCache = new Map()

/**
 * @param {string} pattern
 * @param {{dot?: boolean, nocase?: boolean}} [options]
 * @returns {Matcher}
 */
export function compile(pattern, options) {
  if (typeof pattern !== 'string') throw new TypeError('pattern must be a string')
  const opts = normalizeOptions(options)
  const text = normalizeSeparators(pattern)

  // The directory marker belongs to the path, not to the name a pattern talks
  // about: 'backup/' and 'backup' are the same pattern.
  const body = text.endsWith('/') ? text.slice(0, -1) : text

  const plans = expandBraces(body).map((alternative) => planFor(alternative, opts))
  return new Matcher(pattern, plans, opts)
}

function planFor(pattern, options) {
  const key = optionKey(options) + '\u0000' + pattern
  let plan = sourceCache.get(key)
  if (plan === undefined) {
    // A case-insensitive job folds the pattern once, here, instead of asking the
    // regular expression engine to fold every path it looks at.
    const text = options.nocase ? pattern.toLowerCase() : pattern
    plan = buildPattern(text, options)
    sourceCache.set(key, plan)
  }
  return plan
}
