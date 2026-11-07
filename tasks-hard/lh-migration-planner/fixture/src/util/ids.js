/**
 * Helpers for the id lists that cross the planner.
 *
 * A release is a few hundred migrations and every list in here is a list of
 * ids, so these are plain array helpers rather than anything clever.
 */

/** The ids of `items`, in order. */
export function idsOf(items) {
  return items.map((item) => item.id)
}

/** `list` without duplicates; the first occurrence wins. */
export function unique(list) {
  const seen = new Set()
  const out = []
  for (const value of list) {
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

/** `items` indexed by id, for lookups that would otherwise be a scan. */
export function byId(items) {
  const map = new Map()
  for (const item of items) map.set(item.id, item)
  return map
}
