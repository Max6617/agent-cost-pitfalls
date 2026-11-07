/**
 * Ids.
 *
 * Ids are opaque strings written by the console. Nothing in the service parses
 * them and no ordering is implied by their spelling; the only thing assumed
 * here is that they are non-empty and compare by code unit, which is what makes
 * a decision reproducible across runs.
 */
export function compareIds(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

export function uniqueSorted(values) {
  return [...new Set(values)].sort(compareIds)
}

export function assertId(value, what) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(what + ' must be a non-empty string')
  }
  return value
}
