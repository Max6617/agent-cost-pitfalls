/**
 * ordering.js - the one listing order, as a shared comparator.
 *
 * docs/listing-order.md is the contract; this module is its implementation.
 * Every screen is meant to sort with compareListable (or map through
 * sortListable) instead of hand-rolling another comparator.
 */

/**
 * Compare two listable rows: priority descending, then createdAt ascending,
 * then id ascending. Nulls sort last in every key, in both directions.
 */
export function compareListable(a, b) {
  return (
    compareDesc(a.priority, b.priority) ||
    compareAsc(a.createdAt, b.createdAt) ||
    compareAsc(a.id, b.id)
  )
}

/** The listing for `rows`: a new array, the caller's array untouched. */
export function sortListable(rows) {
  return rows.slice().sort(compareListable)
}

// Ascending, nulls last.
function compareAsc(x, y) {
  if (x == null && y == null) return 0
  if (x == null) return 1
  if (y == null) return -1
  return x < y ? -1 : x > y ? 1 : 0
}

// Descending, nulls last - "last" does not flip with the direction.
function compareDesc(x, y) {
  if (x == null && y == null) return 0
  if (x == null) return 1
  if (y == null) return -1
  return x > y ? -1 : x < y ? 1 : 0
}
