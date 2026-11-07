/**
 * compile — the front door of the selector.
 *
 * A pattern is expanded, turned into one regular-expression plan per brace
 * alternative, and handed to a Matcher. Plans are cached: the backup tool
 * compiles the same handful of patterns for every job it runs.
 */
import { normalizeOptions, optionKey } from './options.js'
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
  const plans = expandBraces(pattern).map((alternative) => planFor(alternative, opts))
  return new Matcher(pattern, plans, opts)
}

function planFor(pattern, options) {
  const key = optionKey(options) + '\u0000' + pattern
  let plan = sourceCache.get(key)
  if (plan === undefined) {
    plan = buildPattern(pattern, options)
    sourceCache.set(key, plan)
  }
  return plan
}
