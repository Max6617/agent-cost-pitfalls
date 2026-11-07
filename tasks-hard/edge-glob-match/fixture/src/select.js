/**
 * select — pick the paths a job's pattern list asks for.
 *
 * A job's list is mostly exclusions written after the inclusion that pulled the
 * paths in, so the list is walked in order and each exclusion takes back what the
 * patterns before it had collected.
 */
import { match } from './match.js'

/**
 * @param {string[]} paths candidate paths, in the tool's own order
 * @param {string[]|string} patterns the job's pattern list
 * @param {{dot?: boolean, nocase?: boolean}} [options]
 * @returns {string[]} the selected paths, in the order they were given
 */
export function select(paths, patterns, options) {
  if (!Array.isArray(paths)) throw new TypeError('paths must be an array')
  const list = Array.isArray(patterns) ? patterns : [patterns]

  const collected = new Set()
  for (const pattern of list) {
    if (typeof pattern !== 'string') throw new TypeError('every pattern must be a string')
    if (pattern.startsWith('!')) {
      const excluded = pattern.slice(1)
      for (const path of collected) {
        if (match(excluded, path, options)) collected.delete(path)
      }
      continue
    }
    for (const path of paths) {
      if (match(pattern, path, options)) collected.add(path)
    }
  }

  return paths.filter((path) => collected.has(path))
}
