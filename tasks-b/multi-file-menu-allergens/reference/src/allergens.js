/**
 * The contains set of a dish.
 *
 * "Contains" is the union of the allergens of the dish's effective ingredient
 * entries. An entry flagged optional is an extra the order has to ask for -
 * the board reflects the dish as it is served by default.
 */
import { sortedUnique } from './sets.js'

export function containsOf(entries, registry, { includeOptional = false } = {}) {
  const out = []
  for (const entry of entries) {
    if (entry.optional && !includeOptional) continue
    out.push(...registry.allergensOf(entry.ref))
  }
  return sortedUnique(out)
}
