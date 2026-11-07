/**
 * Small ordering helpers shared across the service. Comparators return a
 * negative number when `a` sorts ahead of `b`, the way Array.prototype.sort
 * expects, and they are total: equal keys always fall through to the id, so a
 * sort can never depend on the input order.
 */
export const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

export const byRatingDesc = (a, b) => (b.rating - a.rating) || byId(a, b)

/** A sorted copy of `list`; the argument is not modified. */
export function sorted(list, cmp) {
  return [...list].sort(cmp)
}
