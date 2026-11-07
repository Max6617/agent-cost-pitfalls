/**
 * Small set helpers over string arrays.
 *
 * Allergen sets are tiny - a handful of ids per dish - so they are kept as
 * sorted arrays of unique lowercase ids rather than as Set instances, which
 * keeps every value that crosses the public surface JSON-comparable.
 */
export function sortedUnique(list) {
  return [...new Set(list)].sort()
}

export function union(...lists) {
  return sortedUnique(lists.flat())
}

export function intersect(a, b) {
  const wanted = new Set(b)
  return sortedUnique((a ?? []).filter((x) => wanted.has(x)))
}

export function difference(a, b) {
  const drop = new Set(b)
  return sortedUnique((a ?? []).filter((x) => !drop.has(x)))
}
