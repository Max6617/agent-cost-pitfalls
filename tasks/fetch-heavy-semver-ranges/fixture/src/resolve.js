import { parseVersion, compareVersions, sortVersions } from './version.js'
import { satisfies, parseComparatorSet, comparatorSets } from './range.js'

/** Resolver-facing helpers built on the two modules above. */

/** The highest version in the list allowed by the range, or null. */
export function maxSatisfying(versions, range) {
  const allowed = versions.filter((v) => satisfies(v, range))
  if (!allowed.length) return null
  return sortVersions(allowed).pop()
}

/**
 * Pick the best candidate for a dependency.
 *
 * @param {{ name: string, versions: string[], range: string, existing?: string }} request
 */
export function resolveOne(request) {
  const best = maxSatisfying(request.versions ?? [], request.range)
  if (!best) {
    return { name: request.name, ok: false, reason: 'no-matching-version', range: request.range }
  }
  return { name: request.name, ok: true, version: best, changed: best !== request.existing }
}

/** Resolve a whole dependency set, reporting the ones that could not be met. */
export function resolveAll(requests) {
  const resolved = []
  const failed = []
  for (const request of requests) {
    const result = resolveOne(request)
    if (result.ok) resolved.push(result)
    else failed.push(result)
  }
  return { resolved, failed }
}

export { parseVersion, compareVersions, sortVersions, satisfies, parseComparatorSet, comparatorSets }

/** Is this a version the parser accepts at all? */
export function isValidVersion(text) {
  return parseVersion(text) !== null
}
