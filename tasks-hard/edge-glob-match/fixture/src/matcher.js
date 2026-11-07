/**
 * A compiled pattern.
 *
 * Building a matcher is the expensive part (brace expansion, tokenizing,
 * compiling one or more regular expressions), so a matcher is meant to be kept
 * and reused: the backup tool compiles each job's pattern list once and then
 * asks about thousands of paths.
 */
import { stripDirectoryMarker } from './paths.js'

export class Matcher {
  /**
   * @param {string} pattern the pattern as the caller wrote it
   * @param {{source: string}[]} plans one entry per brace alternative
   * @param {{dot: boolean, nocase: boolean}} options
   */
  constructor(pattern, plans, options) {
    this.pattern = pattern
    this.options = options
    this.sources = plans.map((plan) => plan.source)
    this.regexes = this.sources.map((source) => new RegExp(source, 'g'))
  }

  /** Does this pattern match one path? */
  test(path) {
    if (typeof path !== 'string') throw new TypeError('path must be a string')
    const text = stripDirectoryMarker(path)
    return this.regexes.some((regex) => regex.test(text))
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
