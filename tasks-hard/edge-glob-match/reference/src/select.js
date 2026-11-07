/**
 * select — pick the paths a job's pattern list asks for.
 *
 * A job's list has inclusions and exclusions, and the exclusions are written
 * wherever the person who wrote the job felt they belonged. Which is why the
 * list is read in two passes: the inclusions decide what is in, the exclusions
 * decide what is out, and the order in the file never matters.
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

  const includes = []
  const excludes = []
  for (const pattern of list) {
    if (typeof pattern !== 'string') throw new TypeError('every pattern must be a string')
    if (pattern.startsWith('!')) excludes.push(pattern.slice(1))
    else includes.push(pattern)
  }

  // Only exclusions select nothing: there is nothing for them to take back.
  if (includes.length === 0) return []

  return paths.filter((path) => (
    includes.some((pattern) => match(pattern, path, options)) &&
    !excludes.some((pattern) => match(pattern, path, options))
  ))
}
