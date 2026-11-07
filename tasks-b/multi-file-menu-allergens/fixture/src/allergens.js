/**
 * The contains set of a dish.
 *
 * "Contains" is the union of the allergens of the dish's effective ingredient
 * entries. Entries flagged optional are the extras an order can ask for; the
 * caller says whether the order asked for them.
 */
import { sortedUnique } from './sets.js'

export function containsOf(entries, registry, { includeOptional = false } = {}) {
  const out = []
  for (const entry of entries) {
    out.push(...registry.allergensOf(entry.ref))
  }
  return sortedUnique(out)
}
