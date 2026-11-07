/**
 * A compiled pattern.
 *
 * Building a matcher is the expensive part (brace expansion, tokenizing,
 * compiling one or more regular expressions), so a matcher is meant to be kept
 * and reused: the backup tool compiles each job's pattern list once and then
 * asks about thousands of paths. Every regular expression here is stateless -
 * asking the same question twice gives the same answer.
 */
import { isDirectory, stripDirectoryMarker } from './paths.js'

export class Matcher {
  /**
   * @param {string} pattern the pattern as the caller wrote it
   * @param {{source: string, dirOnly: boolean, prefixSource: string|null}[]} plans
   *   one entry per brace alternative
   * @param {{dot: boolean, nocase: boolean}} options
   */
  constructor(pattern, plans, options) {
    this.pattern = pattern
    this.options = options
    this.plans = plans
    this.sources = plans.map((plan) => plan.source)
    const flags = options.nocase ? 'i' : ''
    this.regexes = this.sources.map((source) => new RegExp(source, flags))
    this.prefixRegexes = plans.map((plan) => (
      plan.prefixSource === null ? null : new RegExp(plan.prefixSource, flags)
    ))
  }

  /** Does this pattern match one path? */
  test(path) {
    if (typeof path !== 'string') throw new TypeError('path must be a string')
    const directory = isDirectory(path)
    const text = stripDirectoryMarker(path)

    for (let i = 0; i < this.plans.length; i += 1) {
      const plan = this.plans[i]
      if (plan.dirOnly && !directory) continue
      if (!this.regexes[i].test(text)) continue
      if (!directory && this.prefixRegexes[i] !== null && this.prefixRegexes[i].test(text)) continue
      return true
    }
    return false
  }

  /** The paths of `paths` that this pattern matches, in input order. */
  select(paths) {
    if (!Array.isArray(paths)) throw new TypeError('paths must be an array')
    return paths.filter((path) => this.test(path))
  }

  /** A one-line description, for the backup tool's job log. */
  describe() {
    return this.pattern + (this.options.dot ? ' [dot]' : '') + (this.options.nocase ? ' [nocase]' : '')
  }
}
